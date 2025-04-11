"""
Knowledge models for LLM Troubleshooting Assistant.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from enum import Enum


class KnowledgeType(str, Enum):
    API_DOCUMENTATION = "api_documentation"
    ERROR_PATTERN = "error_pattern"
    TUTORIAL = "tutorial"
    TROUBLESHOOTING_GUIDE = "troubleshooting_guide"
    CODE_SAMPLE = "code_sample"
    BEST_PRACTICE = "best_practice"
    WORKFLOW = "workflow"


class KnowledgeProvider(str, Enum):
    ZEPHYR = "zephyr"
    QTEST = "qtest"
    INTERNAL = "internal"
    GENERAL = "general"


@dataclass
class KnowledgeReference:
    """Reference to a knowledge item used for troubleshooting."""
    id: str
    type: KnowledgeType
    provider: KnowledgeProvider
    title: str
    content: str
    url: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    relevance_score: float = 0.0  # 0.0 to 1.0
    last_updated: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "id": self.id,
            "type": self.type,
            "provider": self.provider,
            "title": self.title,
            "content": self.content[:200] + "..." if len(self.content) > 200 else self.content,
            "url": self.url,
            "tags": self.tags,
            "relevance_score": self.relevance_score,
            "last_updated": self.last_updated
        }


@dataclass
class KnowledgeBase:
    """Collection of knowledge items for troubleshooting assistance."""
    items: List[KnowledgeReference] = field(default_factory=list)
    
    def add_item(self, item: KnowledgeReference):
        """Add a knowledge item to the knowledge base."""
        self.items.append(item)
        
    def find_by_tag(self, tag: str) -> List[KnowledgeReference]:
        """Find knowledge items by tag."""
        return [item for item in self.items if tag in item.tags]
    
    def find_by_provider(self, provider: KnowledgeProvider) -> List[KnowledgeReference]:
        """Find knowledge items by provider."""
        return [item for item in self.items if item.provider == provider]
    
    def find_by_type(self, type: KnowledgeType) -> List[KnowledgeReference]:
        """Find knowledge items by type."""
        return [item for item in self.items if item.type == type]
    
    def find_relevant(self, query: str, threshold: float = 0.5) -> List[KnowledgeReference]:
        """Find knowledge items relevant to a query."""
        # This is a stub implementation. In a real system, this would use
        # vector search or other relevance-based retrieval mechanisms.
        results = []
        query_terms = query.lower().split()
        
        for item in self.items:
            # Naive text matching for demonstration
            content_lower = item.content.lower()
            title_lower = item.title.lower()
            
            # Count matching terms
            matches = sum(1 for term in query_terms if term in content_lower or term in title_lower)
            relevance = matches / len(query_terms) if query_terms else 0
            
            if relevance > threshold:
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