"""
Jira API Client for creating test plans
"""
import os
import requests
import urllib3
from base64 import b64encode

# Disable SSL warnings for corporate environments
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class JiraClient:
    def __init__(self):
        self.base_url = os.getenv('JIRA_BASE_URL', 'https://etoro-jira.atlassian.net')
        self.user_email = os.getenv('JIRA_USER_EMAIL', os.getenv('CONFLUENCE_USER_EMAIL', 'estyca@etoro.com'))
        self.api_token = os.getenv('JIRA_API_TOKEN', os.getenv('CONFLUENCE_API_TOKEN', ''))
        self.verify_ssl = False  # Disable SSL verification for corporate environments
        
    def _get_headers(self):
        auth_string = f"{self.user_email}:{self.api_token}"
        auth_bytes = b64encode(auth_string.encode()).decode()
        
        return {
            'Authorization': f'Basic {auth_bytes}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    
    def get_projects(self):
        """Get all accessible projects"""
        url = f"{self.base_url}/rest/api/3/project"
        response = requests.get(url, headers=self._get_headers(), verify=self.verify_ssl)
        
        if response.status_code == 200:
            return response.json()
        return []
    
    def get_issue_types(self, project_key: str):
        """Get available issue types for a project"""
        # Try the newer API first
        url = f"{self.base_url}/rest/api/3/issue/createmeta/{project_key}/issuetypes"
        response = requests.get(url, headers=self._get_headers(), verify=self.verify_ssl)
        
        if response.status_code == 200:
            data = response.json()
            # Handle both response formats
            if 'issueTypes' in data:
                return data.get('issueTypes', [])
            elif 'values' in data:
                return data.get('values', [])
            elif isinstance(data, list):
                return data
        
        # Fallback: Try the old createmeta API
        url = f"{self.base_url}/rest/api/3/issue/createmeta"
        params = {"projectKeys": project_key, "expand": "projects.issuetypes"}
        response = requests.get(url, headers=self._get_headers(), params=params, verify=self.verify_ssl)
        
        if response.status_code == 200:
            data = response.json()
            projects = data.get('projects', [])
            if projects:
                return projects[0].get('issuetypes', [])
        
        # Final fallback: Get all issue types from the project
        url = f"{self.base_url}/rest/api/3/project/{project_key}"
        response = requests.get(url, headers=self._get_headers(), verify=self.verify_ssl)
        
        if response.status_code == 200:
            project_data = response.json()
            # Get issue types from project
            issue_type_ids = project_data.get('issueTypes', [])
            if issue_type_ids:
                return issue_type_ids
        
        # Last resort: Get all issue types
        url = f"{self.base_url}/rest/api/3/issuetype"
        response = requests.get(url, headers=self._get_headers(), verify=self.verify_ssl)
        
        if response.status_code == 200:
            return response.json()
        
        return []
    
    def create_issue(self, project_key: str, summary: str, description: str = "", issue_type: str = "Task"):
        """Create a new issue in Jira"""
        url = f"{self.base_url}/rest/api/3/issue"
        
        # Build the description in Atlassian Document Format (ADF)
        description_adf = {
            "type": "doc",
            "version": 1,
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": description if description else "Test Plan created from Test Strategy Tool"
                        }
                    ]
                }
            ]
        }
        
        body = {
            "fields": {
                "project": {
                    "key": project_key
                },
                "summary": summary,
                "description": description_adf,
                "issuetype": {
                    "name": issue_type
                }
            }
        }
        
        # Don't add any custom fields - let Jira use defaults
        
        response = requests.post(url, headers=self._get_headers(), json=body, verify=self.verify_ssl)
        
        if response.status_code in [200, 201]:
            result = response.json()
            return {
                "key": result.get("key"),
                "id": result.get("id"),
                "url": f"{self.base_url}/browse/{result.get('key')}"
            }
        else:
            error_detail = response.json() if response.text else {}
            
            # If there's a required field error, try to provide helpful message
            if response.status_code == 400 and 'errors' in error_detail:
                errors = error_detail.get('errors', {})
                missing_fields = [f"{k}: {v}" for k, v in errors.items()]
                raise Exception(f"Missing required fields: {', '.join(missing_fields)}")
            
            raise Exception(f"Failed to create issue: {response.status_code} - {error_detail}")
    
    def search_issue_types(self, project_key: str, type_name: str):
        """Search for a specific issue type in a project"""
        issue_types = self.get_issue_types(project_key)
        
        # Try exact match first
        for it in issue_types:
            if it.get('name', '').lower() == type_name.lower():
                return it
        
        # Try partial match
        for it in issue_types:
            if type_name.lower() in it.get('name', '').lower():
                return it
        
        return None
    
    def search_issues(self, query: str, project_key: str = "QARD", issue_type: str = "Test Plan", max_results: int = 10):
        """Search for issues by text in summary"""
        url = f"{self.base_url}/rest/api/3/search"
        
        # Build JQL query - search in summary, support partial matches
        jql_parts = [f'project = "{project_key}"']
        
        if issue_type:
            jql_parts.append(f'issuetype = "{issue_type}"')
        
        if query:
            # Search in summary with partial match
            jql_parts.append(f'summary ~ "{query}*"')
        
        jql = " AND ".join(jql_parts)
        jql += " ORDER BY updated DESC"
        
        params = {
            "jql": jql,
            "maxResults": max_results,
            "fields": "summary,key,issuetype,status"
        }
        
        response = requests.get(url, headers=self._get_headers(), params=params, verify=self.verify_ssl)
        
        if response.status_code == 200:
            data = response.json()
            issues = data.get('issues', [])
            return [
                {
                    "key": issue.get('key'),
                    "summary": issue.get('fields', {}).get('summary', ''),
                    "status": issue.get('fields', {}).get('status', {}).get('name', ''),
                    "url": f"{self.base_url}/browse/{issue.get('key')}"
                }
                for issue in issues
            ]
        else:
            print(f"Jira search error: {response.status_code} - {response.text}")
            return []

