"""
Knowledge Service for accessing the knowledge base.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional

from ..models.knowledge_models import (
    KnowledgeBase,
    KnowledgeReference,
    KnowledgeType,
    KnowledgeProvider
)

logger = logging.getLogger(__name__)


class KnowledgeService:
    """
    Service for accessing and querying the knowledge base.
    
    The knowledge base contains documentation, error patterns,
    troubleshooting guides, and code samples.
    """
    
    def __init__(self, knowledge_dir: Optional[str] = None):
        """
        Initialize the knowledge service.
        
        Args:
            knowledge_dir: Directory containing knowledge files
                (defaults to ~/.skidbladnir/knowledge)
        """
        self.knowledge_dir = knowledge_dir or os.path.join(
            os.path.expanduser("~"),
            ".skidbladnir",
            "knowledge"
        )
        self.knowledge_base = self._load_knowledge_base()
        
    def _load_knowledge_base(self) -> KnowledgeBase:
        """
        Load the knowledge base from files.
        
        Returns:
            KnowledgeBase: The loaded knowledge base
        """
        knowledge_base = KnowledgeBase()
        
        # In a real implementation, this would load actual files
        # For this demonstration, we'll create a mock knowledge base
        
        # Example knowledge items
        knowledge_items = [
            # Zephyr API documentation
            KnowledgeReference(
                id="zephyr-auth-api",
                type=KnowledgeType.API_DOCUMENTATION,
                provider=KnowledgeProvider.ZEPHYR,
                title="Zephyr Scale Authentication API",
                content=(
                    "Authentication to the Zephyr Scale API requires an API token. "
                    "Generate an API token in Zephyr Scale by navigating to your profile settings. "
                    "Include the token in the Authorization header as 'Bearer [token]'."
                ),
                url="https://support.atlassian.com/zephyr-scale-cloud/docs/use-the-zephyr-scale-cloud-rest-api/",
                tags=["zephyr", "authentication", "api", "token"]
            ),
            
            # qTest API documentation
            KnowledgeReference(
                id="qtest-auth-api",
                type=KnowledgeType.API_DOCUMENTATION,
                provider=KnowledgeProvider.QTEST,
                title="qTest Authentication API",
                content=(
                    "qTest API authentication uses OAuth 2.0. Generate an API token in qTest "
                    "by navigating to Settings > API & SDK. Use the token in the Authorization "
                    "header as 'Bearer [token]'."
                ),
                url="https://api.qasymphony.com/",
                tags=["qtest", "authentication", "api", "oauth", "token"]
            ),
            
            # Error pattern - Authentication
            KnowledgeReference(
                id="error-pattern-auth",
                type=KnowledgeType.ERROR_PATTERN,
                provider=KnowledgeProvider.INTERNAL,
                title="API Authentication Errors",
                content=(
                    "Authentication errors (HTTP 401) typically indicate an invalid or expired API token. "
                    "Common causes include:\n"
                    "1. Incorrect token value\n"
                    "2. Expired token\n"
                    "3. Token revoked by administrator\n"
                    "4. Using a token from the wrong environment\n"
                    "5. Insufficient permissions for the token"
                ),
                tags=["error", "authentication", "401", "token"]
            ),
            
            # Error pattern - Rate limiting
            KnowledgeReference(
                id="error-pattern-rate-limit",
                type=KnowledgeType.ERROR_PATTERN,
                provider=KnowledgeProvider.INTERNAL,
                title="API Rate Limiting Errors",
                content=(
                    "Rate limiting errors (HTTP 429) occur when too many requests are sent to the API "
                    "in a short period. This is a protective measure by the API provider. Solutions include:\n"
                    "1. Implementing exponential backoff\n"
                    "2. Reducing concurrency\n"
                    "3. Distributing requests over time\n"
                    "4. Caching responses when appropriate\n"
                    "5. Batch operations when possible"
                ),
                tags=["error", "rate-limit", "429", "throttling"]
            ),
            
            # Zephyr troubleshooting guide
            KnowledgeReference(
                id="zephyr-troubleshooting",
                type=KnowledgeType.TROUBLESHOOTING_GUIDE,
                provider=KnowledgeProvider.ZEPHYR,
                title="Zephyr Scale API Troubleshooting Guide",
                content=(
                    "Common issues with Zephyr Scale API:\n\n"
                    "1. Authentication failures: Check API token validity and permissions\n"
                    "2. Rate limiting: Zephyr Scale enforces rate limits per user\n"
                    "3. Missing resources: Verify folder and test case IDs exist\n"
                    "4. Permission issues: Ensure user has access to the resources\n"
                    "5. Server errors: Some operations may time out for large datasets"
                ),
                tags=["zephyr", "troubleshooting", "api", "common-issues"]
            ),
            
            # qTest troubleshooting guide
            KnowledgeReference(
                id="qtest-troubleshooting",
                type=KnowledgeType.TROUBLESHOOTING_GUIDE,
                provider=KnowledgeProvider.QTEST,
                title="qTest API Troubleshooting Guide",
                content=(
                    "Common issues with qTest API:\n\n"
                    "1. Authentication failures: Check API token validity and permissions\n"
                    "2. Project access: Ensure token has access to the specific project\n"
                    "3. Field validation: qTest has strict field validation requirements\n"
                    "4. Attachment size limits: qTest limits attachment sizes\n"
                    "5. Module hierarchy: Test cases must be created within a valid module"
                ),
                tags=["qtest", "troubleshooting", "api", "common-issues"]
            ),
            
            # Code sample - Authentication
            KnowledgeReference(
                id="code-auth-retry",
                type=KnowledgeType.CODE_SAMPLE,
                provider=KnowledgeProvider.INTERNAL,
                title="Authentication with Retry Logic",
                content=(
                    "```javascript\n"
                    "async function authenticateWithRetry(credentials, maxRetries = 3) {\n"
                    "  let retries = 0;\n"
                    "  \n"
                    "  while (retries < maxRetries) {\n"
                    "    try {\n"
                    "      const response = await api.authenticate(credentials);\n"
                    "      return response.token;\n"
                    "    } catch (error) {\n"
                    "      retries++;\n"
                    "      if (error.status === 401) {\n"
                    "        console.log(`Authentication failed, attempt ${retries} of ${maxRetries}`);\n"
                    "        if (retries >= maxRetries) {\n"
                    "          throw new Error('Authentication failed after maximum retry attempts');\n"
                    "        }\n"
                    "        // Slight delay before retrying\n"
                    "        await new Promise(resolve => setTimeout(resolve, 1000));\n"
                    "      } else {\n"
                    "        throw error; // Rethrow if it's not an auth error\n"
                    "      }\n"
                    "    }\n"
                    "  }\n"
                    "}\n"
                    "```"
                ),
                tags=["code", "authentication", "retry", "javascript"]
            ),
            
            # Code sample - Rate limiting
            KnowledgeReference(
                id="code-rate-limiting",
                type=KnowledgeType.CODE_SAMPLE,
                provider=KnowledgeProvider.INTERNAL,
                title="Rate Limiting Handling with Exponential Backoff",
                content=(
                    "```javascript\n"
                    "class RateLimitedApiClient {\n"
                    "  constructor(baseUrl, options = {}) {\n"
                    "    this.baseUrl = baseUrl;\n"
                    "    this.maxRetries = options.maxRetries || 5;\n"
                    "    this.baseDelay = options.baseDelay || 1000;\n"
                    "    this.maxDelay = options.maxDelay || 30000;\n"
                    "  }\n"
                    "  \n"
                    "  async request(endpoint, options = {}) {\n"
                    "    let retries = 0;\n"
                    "    \n"
                    "    while (true) {\n"
                    "      try {\n"
                    "        const response = await fetch(`${this.baseUrl}/${endpoint}`, options);\n"
                    "        \n"
                    "        if (response.status === 429) {\n"
                    "          retries++;\n"
                    "          if (retries > this.maxRetries) {\n"
                    "            throw new Error('Rate limit exceeded maximum retries');\n"
                    "          }\n"
                    "          \n"
                    "          // Exponential backoff\n"
                    "          const delay = Math.min(\n"
                    "            Math.pow(2, retries) * this.baseDelay, \n"
                    "            this.maxDelay\n"
                    "          );\n"
                    "          \n"
                    "          console.log(`Rate limited, retrying in ${delay}ms`);\n"
                    "          await new Promise(resolve => setTimeout(resolve, delay));\n"
                    "          continue;\n"
                    "        }\n"
                    "        \n"
                    "        return response;\n"
                    "      } catch (error) {\n"
                    "        if (retries >= this.maxRetries) {\n"
                    "          throw error;\n"
                    "        }\n"
                    "        retries++;\n"
                    "      }\n"
                    "    }\n"
                    "  }\n"
                    "}\n"
                    "```"
                ),
                tags=["code", "rate-limiting", "backoff", "javascript"]
            ),
            
            # Best practice - API error handling
            KnowledgeReference(
                id="best-practice-error-handling",
                type=KnowledgeType.BEST_PRACTICE,
                provider=KnowledgeProvider.INTERNAL,
                title="API Error Handling Best Practices",
                content=(
                    "Effective API error handling guidelines:\n\n"
                    "1. Always check HTTP status codes\n"
                    "2. Parse error response bodies for details\n"
                    "3. Implement retry with exponential backoff for transient errors\n"
                    "4. Log complete error details for debugging\n"
                    "5. Present user-friendly error messages\n"
                    "6. Handle specific error types differently\n"
                    "7. Include request IDs in error logs\n"
                    "8. Implement circuit breakers for failing services"
                ),
                tags=["best-practice", "error-handling", "api"]
            ),
            
            # Workflow - Migration workflow
            KnowledgeReference(
                id="workflow-migration",
                type=KnowledgeType.WORKFLOW,
                provider=KnowledgeProvider.INTERNAL,
                title="Zephyr to qTest Migration Workflow",
                content=(
                    "Optimal workflow for Zephyr to qTest migration:\n\n"
                    "1. Connect to Zephyr API and validate credentials\n"
                    "2. Retrieve test cases with pagination\n"
                    "3. Connect to qTest API and validate credentials\n"
                    "4. Create or validate destination folder structure\n"
                    "5. Transform test cases to qTest format\n"
                    "6. Create test cases in qTest\n"
                    "7. Process attachments separately\n"
                    "8. Validate migration results\n"
                    "9. Generate migration report"
                ),
                tags=["workflow", "migration", "zephyr", "qtest"]
            )
        ]
        
        # Add items to knowledge base
        for item in knowledge_items:
            knowledge_base.add_item(item)
            
        return knowledge_base
    
    def search(self, query: str, provider: Optional[KnowledgeProvider] = None,
              type: Optional[KnowledgeType] = None) -> List[KnowledgeReference]:
        """
        Search the knowledge base.
        
        Args:
            query: The search query
            provider: Optional filter by provider
            type: Optional filter by knowledge type
            
        Returns:
            List[KnowledgeReference]: The search results
        """
        # First filter by provider and type if specified
        items = self.knowledge_base.items
        
        if provider:
            items = [item for item in items if item.provider == provider]
            
        if type:
            items = [item for item in items if item.type == type]
            
        # Then search by content similarity
        results = []
        query_terms = query.lower().split()
        
        for item in items:
            # Simple text matching for demonstration
            content_lower = item.content.lower()
            title_lower = item.title.lower()
            
            # Count matching terms
            matches = sum(1 for term in query_terms if term in content_lower or term in title_lower)
            
            if matches > 0:
                # Create a copy with relevance score
                relevance = matches / len(query_terms) if query_terms else 0
                item_copy = KnowledgeReference(
                    id=item.id,
                    type=item.type,
                    provider=item.provider,
                    title=item.title,
                    content=item.content,
                    url=item.url,
                    tags=item.tags,
                    relevance_score=relevance,
                    last_updated=item.last_updated
                )
                results.append(item_copy)
        
        # Sort by relevance
        results.sort(key=lambda x: x.relevance_score, reverse=True)
        return results
    
    def get_by_id(self, id: str) -> Optional[KnowledgeReference]:
        """
        Get a knowledge item by ID.
        
        Args:
            id: The ID of the knowledge item
            
        Returns:
            Optional[KnowledgeReference]: The knowledge item, or None if not found
        """
        for item in self.knowledge_base.items:
            if item.id == id:
                return item
        return None
    
    def get_by_error_type(self, error_type: str) -> List[KnowledgeReference]:
        """
        Get knowledge items related to a specific error type.
        
        Args:
            error_type: The error type
            
        Returns:
            List[KnowledgeReference]: The knowledge items
        """
        # Map error type to relevant tags
        error_tags = {
            "authentication": ["authentication", "auth", "token", "401"],
            "rate_limit": ["rate-limit", "rate-limiting", "throttle", "429"],
            "permission": ["permission", "authorization", "access", "403"],
            "network": ["network", "connection", "timeout", "dns"],
            "resource_not_found": ["not-found", "missing", "404"],
            "validation": ["validation", "invalid", "400"],
            "server_error": ["server-error", "500", "503"]
        }
        
        tags = error_tags.get(error_type, [error_type])
        
        # Find items with matching tags
        results = []
        for item in self.knowledge_base.items:
            if any(tag in item.tags for tag in tags):
                results.append(item)
                
        return results
        
    def get_provider_documentation(self, provider: KnowledgeProvider) -> List[KnowledgeReference]:
        """
        Get documentation for a specific provider.
        
        Args:
            provider: The provider
            
        Returns:
            List[KnowledgeReference]: The documentation items
        """
        return [item for item in self.knowledge_base.items 
                if item.provider == provider and item.type == KnowledgeType.API_DOCUMENTATION]
    
    def get_code_samples(self, tags: List[str]) -> List[KnowledgeReference]:
        """
        Get code samples for a specific tag.
        
        Args:
            tags: The tags to search for
            
        Returns:
            List[KnowledgeReference]: The code samples
        """
        return [item for item in self.knowledge_base.items 
                if item.type == KnowledgeType.CODE_SAMPLE and 
                any(tag in item.tags for tag in tags)]