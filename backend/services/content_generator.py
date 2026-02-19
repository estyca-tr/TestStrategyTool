"""
Service for generating test strategy content from uploaded documents.
Analyzes HLD/PRD documents and suggests content for each strategy section.
"""

import re
from typing import Dict, List, Optional


def extract_keywords(text: str) -> List[str]:
    """Extract important keywords from text"""
    # Common tech/feature words to look for
    keywords = []
    
    # Find capitalized words (likely feature names)
    caps = re.findall(r'\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\b', text)
    keywords.extend(caps[:20])
    
    # Find words after common prefixes
    features = re.findall(r'(?:feature|module|component|service|api|endpoint|function)[\s:]+([^\n.]+)', text, re.I)
    keywords.extend(features[:10])
    
    return list(set(keywords))


def extract_features(text: str) -> List[str]:
    """Extract feature names from document"""
    features = []
    
    # Look for bullet points
    bullets = re.findall(r'[-•*]\s*([^\n]+)', text)
    features.extend([b.strip() for b in bullets if len(b.strip()) > 5][:15])
    
    # Look for numbered items
    numbered = re.findall(r'\d+[.)]\s*([^\n]+)', text)
    features.extend([n.strip() for n in numbered if len(n.strip()) > 5][:15])
    
    return features


def extract_requirements(text: str) -> List[str]:
    """Extract requirements from text"""
    requirements = []
    
    # Look for "shall", "must", "should" statements
    reqs = re.findall(r'[^.]*(?:shall|must|should|will|need to)[^.]+\.', text, re.I)
    requirements.extend([r.strip() for r in reqs][:10])
    
    return requirements


def extract_tech_stack(text: str) -> List[str]:
    """Extract technology mentions"""
    tech_keywords = [
        'python', 'java', 'javascript', 'typescript', 'react', 'angular', 'vue',
        'node', 'express', 'django', 'flask', 'spring', 'docker', 'kubernetes',
        'aws', 'azure', 'gcp', 'postgresql', 'mysql', 'mongodb', 'redis',
        'api', 'rest', 'graphql', 'microservice', 'kafka', 'rabbitmq',
        'jenkins', 'github', 'gitlab', 'ci/cd', 'terraform', 'nginx'
    ]
    
    found = []
    text_lower = text.lower()
    for tech in tech_keywords:
        if tech in text_lower:
            found.append(tech.title())
    
    return found


def generate_strategy_content(documents: List[Dict], is_cross_team: bool = False, participants: List[Dict] = None) -> Dict[str, str]:
    """
    Generate test strategy content based on uploaded documents.
    
    Args:
        documents: List of document dicts with 'content_text', 'doc_type', 'name'
        is_cross_team: Whether this is a cross-team E2E strategy
        participants: List of participant dicts for cross-team projects
    
    Returns:
        Dict with suggested content for each strategy section
    """
    participants = participants or []
    
    # Combine all document content
    all_text = ""
    hld_text = ""
    prd_text = ""
    
    for doc in documents:
        content = doc.get('content_text', '') or ''
        all_text += content + "\n\n"
        
        if doc.get('doc_type') == 'hld':
            hld_text += content + "\n"
        elif doc.get('doc_type') == 'prd':
            prd_text += content + "\n"
    
    if not all_text.strip():
        return {
            "error": "No document content available. Please upload documents with text content."
        }
    
    # Extract information
    features = extract_features(all_text)
    requirements = extract_requirements(all_text)
    tech_stack = extract_tech_stack(all_text)
    keywords = extract_keywords(all_text)
    
    # Generate content for each section
    result = {}
    
    # Introduction
    if is_cross_team:
        intro_parts = ["## Cross-Team E2E Test Strategy\n\nThis test strategy document outlines the **cross-team End-to-End testing approach** for this project, coordinating testing efforts across multiple teams."]
        if participants:
            teams = list(set([p.get('team', 'Unknown') for p in participants]))
            intro_parts.append(f"\n\n**Participating Teams:** {', '.join(teams)}")
            intro_parts.append(f"\n**Total Participants:** {len(participants)}")
    else:
        intro_parts = ["This test strategy document outlines the testing approach for the system described in the provided HLD and PRD documents."]
    if keywords:
        intro_parts.append(f"\n\nKey components include: {', '.join(keywords[:10])}.")
    if tech_stack:
        intro_parts.append(f"\n\nTechnology stack: {', '.join(tech_stack)}.")
    result['introduction'] = ' '.join(intro_parts)
    
    # Scope In
    scope_in_items = []
    if features:
        scope_in_items.extend([f"- {f}" for f in features[:10]])
    if requirements:
        scope_in_items.extend([f"- {r[:100]}" for r in requirements[:5]])
    if scope_in_items:
        result['scope_in'] = "Features and functionalities to be tested:\n\n" + "\n".join(scope_in_items)
    else:
        result['scope_in'] = "Features to be tested:\n\n- [List main features from documents]\n- [Add functional requirements]\n- [Include integration points]"
    
    # Scope Out
    result['scope_out'] = """Features NOT to be tested in this phase:

- Third-party integrations (will be tested separately)
- Performance testing under extreme load (separate performance test plan)
- Security penetration testing (handled by security team)
- Legacy system compatibility (if applicable)

Reason: Focus on core functionality first, other aspects will be covered in dedicated test cycles."""
    
    # Test Approach
    result['test_approach'] = """Testing Methodology: Risk-Based Testing with Agile Integration

Approach:
1. **Risk Analysis** - Identify critical features based on business impact
2. **Test Prioritization** - High-risk areas tested first
3. **Iterative Testing** - Tests executed in sprints
4. **Continuous Feedback** - Daily status updates

Test Levels:
- Unit Testing (by developers)
- Integration Testing
- System Testing
- User Acceptance Testing (UAT)"""
    
    # Test Types
    test_types = """Types of testing to be performed:

**Functional Testing**
- Feature validation
- Business logic verification
- User workflow testing

**Integration Testing**
- API integration tests
- Database integration
- Third-party service integration

**Regression Testing**
- Automated regression suite
- Critical path testing

**UI/UX Testing**
- User interface validation
- Cross-browser testing
- Responsive design testing"""
    
    if tech_stack:
        test_types += f"\n\n**Technology-Specific Testing**\n- {', '.join(tech_stack)} compatibility"
    
    result['test_types'] = test_types
    
    # Test Environment
    env_content = """Test Environment Requirements:

**Hardware:**
- Test servers with adequate resources
- Client machines for UI testing

**Software:**"""
    
    if tech_stack:
        env_content += "\n- " + "\n- ".join(tech_stack)
    
    env_content += """

**Test Data:**
- Anonymized production data subset
- Synthetic test data for edge cases

**Network:**
- Isolated test network
- VPN access for remote testing"""
    
    result['test_environment'] = env_content
    
    # Entry Criteria
    result['entry_criteria'] = """Conditions to begin testing:

- [ ] Development complete for features in scope
- [ ] Unit tests passing (>80% coverage)
- [ ] Code review completed
- [ ] Test environment provisioned and stable
- [ ] Test data prepared
- [ ] Test cases reviewed and approved
- [ ] All blocking defects from previous cycle resolved"""
    
    # Exit Criteria
    result['exit_criteria'] = """Conditions to conclude testing:

- [ ] All planned test cases executed
- [ ] Critical and High severity defects resolved
- [ ] Test coverage meets target (>90%)
- [ ] No open blockers
- [ ] Performance benchmarks achieved
- [ ] UAT sign-off received
- [ ] Test summary report approved"""
    
    # Risks & Mitigations
    result['risks_and_mitigations'] = """Risk Assessment:

**Risk 1: Limited Testing Time**
- Impact: High
- Probability: Medium
- Mitigation: Prioritize critical features, automate regression tests

**Risk 2: Test Environment Instability**
- Impact: High
- Probability: Low
- Mitigation: Backup environment ready, environment monitoring

**Risk 3: Incomplete Requirements**
- Impact: Medium
- Probability: Medium
- Mitigation: Regular sync with product team, assumption documentation

**Risk 4: Resource Constraints**
- Impact: Medium
- Probability: Low
- Mitigation: Cross-training team members, clear task prioritization"""
    
    # Open Points (questions/issues to resolve)
    if is_cross_team:
        result['open_points'] = """## נקודות פתוחות / Open Points

**Pending Decisions:**
- [ ] Data synchronization approach between teams
- [ ] Shared test environment access and scheduling
- [ ] Integration points ownership

**Questions for Stakeholders:**
- [ ] Timeline dependencies between team deliverables
- [ ] Fallback scenarios for blocked team dependencies
- [ ] Sign-off process for cross-team features

**Technical Clarifications Needed:**
- [ ] API contracts between services
- [ ] Test data requirements and sharing
- [ ] Monitoring and logging access"""
    else:
        result['open_points'] = """## נקודות פתוחות / Open Points

- [ ] [Add pending decisions here]
- [ ] [Add questions for stakeholders]
- [ ] [Add technical clarifications needed]"""

    # Resources
    if is_cross_team and participants:
        resources_content = """## Team & Resources

**Responsibility Matrix:**
| Team | Participant | Role | Testing Focus |
|------|-------------|------|---------------|
"""
        for p in participants:
            resources_content += f"| {p.get('team', '-')} | {p.get('name', '-')} | {p.get('role', 'QA')} | [Define focus area] |\n"
        
        resources_content += """
**Coordination:**
- Daily sync meetings
- Shared Slack channel
- Weekly status report

**Tools:**
- Test Management: Jira/TestRail
- Communication: Slack/Teams
- Documentation: Confluence"""
        result['resources'] = resources_content
    else:
        result['resources'] = """Team & Resources:

**Team Structure:**
- Test Lead: [Name] - Strategy, planning, reporting
- QA Engineers: [Names] - Test execution, defect management
- Automation Engineer: [Name] - Test automation framework

**Tools:**
- Test Management: [Jira/TestRail/etc.]
- Automation: [Selenium/Playwright/Cypress]
- API Testing: [Postman/REST Assured]
- CI/CD: [Jenkins/GitHub Actions]

**Documentation:**
- Test Strategy (this document)
- Test Plan
- Test Cases
- Defect Reports"""
    
    # Schedule
    result['schedule'] = """Testing Timeline:

**Week 1: Preparation**
- Test strategy review
- Test case development
- Environment setup

**Week 2-3: Test Execution Phase 1**
- Smoke testing
- Core functionality testing
- Integration testing

**Week 4: Test Execution Phase 2**
- Full regression
- Edge case testing
- Performance validation

**Week 5: Closure**
- Defect verification
- UAT support
- Final reporting"""
    
    # Deliverables
    result['deliverables'] = """Test Deliverables:

**Planning Phase:**
- Test Strategy Document (this document)
- Test Plan
- Test Case Repository

**Execution Phase:**
- Daily Test Status Reports
- Defect Reports
- Test Execution Logs

**Closure Phase:**
- Test Summary Report
- Defect Metrics Report
- Lessons Learned Document
- UAT Sign-off Document"""
    
    return result






