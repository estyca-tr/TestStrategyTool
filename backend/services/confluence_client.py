"""
Confluence API Client for publishing test strategies
"""
import os
import requests
import urllib3
from base64 import b64encode

# Disable SSL warnings for corporate environments
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class ConfluenceClient:
    def __init__(self):
        self.base_url = os.getenv('CONFLUENCE_BASE_URL', 'https://etoro-jira.atlassian.net/wiki')
        self.user_email = os.getenv('CONFLUENCE_USER_EMAIL', 'estyca@etoro.com')
        self.api_token = os.getenv('CONFLUENCE_API_TOKEN', '')
        self.verify_ssl = False  # Disable SSL verification for corporate environments
        
    def _get_headers(self):
        auth_string = f"{self.user_email}:{self.api_token}"
        auth_bytes = b64encode(auth_string.encode()).decode()
        
        return {
            'Authorization': f'Basic {auth_bytes}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    
    def get_space(self, space_key: str):
        """Get space details"""
        url = f"{self.base_url}/rest/api/space/{space_key}"
        response = requests.get(url, headers=self._get_headers(), verify=self.verify_ssl)
        
        if response.status_code == 200:
            return response.json()
        return None
    
    def create_page(self, space_key: str, title: str, content_html: str, parent_id: str = None):
        """Create a new page in Confluence"""
        url = f"{self.base_url}/rest/api/content"
        
        body = {
            "type": "page",
            "title": title,
            "space": {
                "key": space_key
            },
            "body": {
                "storage": {
                    "value": content_html,
                    "representation": "storage"
                }
            }
        }
        
        if parent_id:
            body["ancestors"] = [{"id": parent_id}]
        
        response = requests.post(url, headers=self._get_headers(), json=body, verify=self.verify_ssl)
        
        if response.status_code in [200, 201]:
            return response.json()
        else:
            error_detail = response.json() if response.text else {}
            raise Exception(f"Failed to create page: {response.status_code} - {error_detail}")
    
    def update_page(self, page_id: str, title: str, content_html: str, version: int):
        """Update an existing page in Confluence"""
        url = f"{self.base_url}/rest/api/content/{page_id}"
        
        body = {
            "version": {
                "number": version + 1
            },
            "title": title,
            "type": "page",
            "body": {
                "storage": {
                    "value": content_html,
                    "representation": "storage"
                }
            }
        }
        
        response = requests.put(url, headers=self._get_headers(), json=body, verify=self.verify_ssl)
        
        if response.status_code == 200:
            return response.json()
        else:
            error_detail = response.json() if response.text else {}
            raise Exception(f"Failed to update page: {response.status_code} - {error_detail}")
    
    def find_page_by_title(self, space_key: str, title: str):
        """Find a page by title in a space"""
        url = f"{self.base_url}/rest/api/content"
        params = {
            "spaceKey": space_key,
            "title": title,
            "type": "page"
        }
        
        response = requests.get(url, headers=self._get_headers(), params=params, verify=self.verify_ssl)
        
        if response.status_code == 200:
            results = response.json().get('results', [])
            return results[0] if results else None
        return None


def strategy_to_confluence_html(strategy: dict) -> str:
    """Convert a test strategy to Confluence storage format HTML"""
    
    sections = {
        'introduction': 'Introduction',
        'scope_in': 'In Scope',
        'scope_out': 'Out of Scope',
        'test_approach': 'Test Approach',
        'test_types': 'Test Types',
        'test_environment': 'Test Environment',
        'entry_criteria': 'Entry Criteria',
        'exit_criteria': 'Exit Criteria',
        'risks_and_mitigations': 'Risks & Mitigations',
        'open_points': 'Open Points / נקודות פתוחות',
        'resources': 'Resources',
        'schedule': 'Schedule',
        'deliverables': 'Deliverables'
    }
    
    html_parts = []
    
    # Header info panel
    html_parts.append(f"""
<ac:structured-macro ac:name="info" ac:schema-version="1">
  <ac:rich-text-body>
    <p><strong>Project:</strong> {strategy.get('project_name', 'N/A')}</p>
    <p><strong>Version:</strong> {strategy.get('version', '1.0')}</p>
    <p><strong>Status:</strong> {strategy.get('status', 'draft')}</p>
    <p><strong>Author:</strong> {strategy.get('created_by', 'N/A')}</p>
  </ac:rich-text-body>
</ac:structured-macro>
""")
    
    # Table of Contents
    html_parts.append("""
<ac:structured-macro ac:name="toc" ac:schema-version="1">
  <ac:parameter ac:name="maxLevel">2</ac:parameter>
</ac:structured-macro>
<hr/>
""")
    
    # Content sections
    for key, label in sections.items():
        content = strategy.get(key, '').strip()
        if content:
            # Convert newlines to paragraphs
            paragraphs = content.split('\n')
            content_html = ''.join([f'<p>{p}</p>' if p.strip() else '' for p in paragraphs])
            
            html_parts.append(f"""
<h2>{label}</h2>
{content_html}
""")
    
    return ''.join(html_parts)

