"""
Data leakage detection and prevention utilities for LLM Security.
"""

import re
import difflib
from typing import Dict, List, Any, Optional, Tuple, Set, Union

from ..models.security_models import Threat, SecurityLevel, ThreatType, ValidationResult


class DataLeakageDetector:
    """Detector for sensitive data leakage between input and output."""
    
    def __init__(self, similarity_threshold: float = 0.85, sensitive_fields: Set[str] = None):
        """
        Initialize with similarity threshold and sensitive field definitions.
        
        Args:
            similarity_threshold: Threshold for string similarity to detect leakage
            sensitive_fields: Set of field names considered sensitive
        """
        self.similarity_threshold = similarity_threshold
        self.default_sensitive_fields = {
            "password", "api_key", "token", "secret", "credential", "auth", 
            "key", "private", "certificate", "access_key", "access_token",
            "session", "jwt", "bearer", "nonce", "hash", "salt"
        }
        
        # Add custom sensitive fields if provided
        self.sensitive_fields = self.default_sensitive_fields
        if sensitive_fields:
            self.sensitive_fields.update(sensitive_fields)
    
    def detect_data_leakage(self, input_text: str, output_text: str, 
                           min_sequence_length: int = 10) -> List[Dict[str, Any]]:
        """
        Detect potential data leakage between input and output.
        
        Args:
            input_text: Original input text
            output_text: Generated output text
            min_sequence_length: Minimum sequence length to consider for leakage
            
        Returns:
            List[Dict[str, Any]]: List of detected leakage instances
        """
        if not input_text or not output_text:
            return []
        
        detections = []
        
        # Find matching sequences between input and output
        # Using difflib to find longest matching substrings
        matcher = difflib.SequenceMatcher(None, input_text, output_text)
        for match in matcher.get_matching_blocks():
            # Skip small matches
            if match.size < min_sequence_length:
                continue
                
            # Extract the matching sequence
            leaked_text = input_text[match.a:match.a + match.size]
            
            # Skip if the matched text is too common or generic
            if self._is_generic_text(leaked_text):
                continue
                
            # Add detection
            detections.append({
                "type": "data_leakage",
                "value": leaked_text,
                "input_position": match.a,
                "output_position": match.b,
                "length": match.size,
                "similarity": 1.0  # Exact match has similarity 1.0
            })
        
        # Also check for approximate matches (fuzzy matching)
        # Split input into chunks and check for similar text in output
        chunks = self._split_into_chunks(input_text, min_sequence_length, overlap=5)
        for i, chunk in enumerate(chunks):
            # Skip if the chunk is too common or generic
            if self._is_generic_text(chunk):
                continue
                
            # Find similar text in output
            matches = self._find_similar_text(chunk, output_text, self.similarity_threshold)
            
            # Record matches
            for match in matches:
                # Position in input is approximate
                approx_position = i * (min_sequence_length - 5)
                if approx_position < 0:
                    approx_position = 0
                
                detections.append({
                    "type": "fuzzy_data_leakage",
                    "value": chunk,
                    "similar_text": match["text"],
                    "input_position": approx_position,
                    "output_position": match["position"],
                    "length": len(chunk),
                    "similarity": match["similarity"]
                })
        
        return detections
    
    def detect_sensitive_field_leakage(self, input_data: Dict[str, Any], 
                                      output_text: str) -> List[Dict[str, Any]]:
        """
        Detect leakage of sensitive fields from structured input to output.
        
        Args:
            input_data: Structured input data with field names
            output_text: Generated output text
            
        Returns:
            List[Dict[str, Any]]: List of detected sensitive field leakage
        """
        if not input_data or not output_text:
            return []
            
        detections = []
        
        # Process fields recursively
        self._check_fields_recursive(input_data, output_text, "", detections)
        
        return detections
    
    def _check_fields_recursive(self, data: Any, output_text: str, 
                               path: str, detections: List[Dict[str, Any]]):
        """
        Recursively check fields in structured data for leakage.
        
        Args:
            data: Data to check
            output_text: Output text to search in
            path: Current path in the data structure
            detections: List to add detections to
        """
        if isinstance(data, dict):
            # Process dictionary
            for key, value in data.items():
                # Check if key name contains sensitive terms
                current_path = f"{path}.{key}" if path else key
                self._check_field_value(key, value, output_text, current_path, detections)
                
                # Recursively check nested values
                self._check_fields_recursive(value, output_text, current_path, detections)
                
        elif isinstance(data, list):
            # Process list
            for i, item in enumerate(data):
                current_path = f"{path}[{i}]"
                # Recursively check items
                self._check_fields_recursive(item, output_text, current_path, detections)
    
    def _check_field_value(self, field_name: str, value: Any, output_text: str, 
                          path: str, detections: List[Dict[str, Any]]):
        """
        Check a single field value for leakage.
        
        Args:
            field_name: Name of the field
            value: Value to check
            output_text: Output text to search in
            path: Path to the field
            detections: List to add detections to
        """
        # Skip non-string values
        if not isinstance(value, str) or not value:
            return
            
        # Check if the field name is in sensitive fields
        is_sensitive_field = any(
            sensitive in field_name.lower() 
            for sensitive in self.sensitive_fields
        )
        
        # Check if field value appears in output
        if is_sensitive_field and value in output_text:
            detections.append({
                "type": "sensitive_field_leak",
                "field_name": field_name,
                "path": path,
                "value_length": len(value),
                "output_position": output_text.find(value)
            })
    
    def _is_generic_text(self, text: str) -> bool:
        """
        Determine if text is too generic to be considered a leakage.
        
        Args:
            text: Text to check
            
        Returns:
            bool: True if text is generic, False otherwise
        """
        # Skip very short text
        if len(text) < 5:
            return True
            
        # Skip text with only whitespace or common punctuation
        if text.isspace() or set(text).issubset(set(" \t\n,.;:!?()-")):
            return True
            
        # Skip if text is all digits or common formatting
        if text.isdigit() or text.isalpha():
            return True
            
        # Skip common programming language keywords and phrases
        common_phrases = {
            "function", "return", "import", "from", "class", "public", "private",
            "static", "void", "int", "string", "float", "bool", "const", "let",
            "var", "for", "while", "if", "else", "switch", "case", "try", "catch",
            "true", "false", "null", "undefined", "None", "def", "async", "await"
        }
        
        words = text.lower().split()
        if all(word in common_phrases for word in words):
            return True
            
        return False
    
    def _split_into_chunks(self, text: str, chunk_size: int, overlap: int = 0) -> List[str]:
        """
        Split text into overlapping chunks.
        
        Args:
            text: Text to split
            chunk_size: Size of each chunk
            overlap: Number of overlapping characters
            
        Returns:
            List[str]: List of text chunks
        """
        chunks = []
        
        # Skip if text is shorter than chunk size
        if len(text) <= chunk_size:
            chunks.append(text)
            return chunks
            
        pos = 0
        while pos < len(text):
            # Get chunk with overlap
            end = min(pos + chunk_size, len(text))
            chunks.append(text[pos:end])
            
            # Move position, accounting for overlap
            pos += chunk_size - overlap
            
        return chunks
    
    def _find_similar_text(self, query: str, text: str, 
                          threshold: float) -> List[Dict[str, Any]]:
        """
        Find text segments similar to query in text.
        
        Args:
            query: Text to search for
            text: Text to search in
            threshold: Similarity threshold
            
        Returns:
            List[Dict[str, Any]]: List of similar text segments with positions and scores
        """
        matches = []
        
        # Skip if query is very short
        if len(query) < 5:
            return matches
            
        # Slide a window through the text and check similarity
        window_size = max(len(query), 10)  # Use at least 10 characters
        
        # Limit window slides for performance
        max_positions = 1000  # Limit for performance
        step = max(1, (len(text) - window_size) // max_positions)
        
        pos = 0
        while pos <= len(text) - window_size:
            # Extract text segment
            segment = text[pos:pos + window_size]
            
            # Calculate similarity
            similarity = self._calculate_similarity(query, segment)
            
            # Record if above threshold
            if similarity >= threshold:
                matches.append({
                    "text": segment,
                    "position": pos,
                    "similarity": similarity
                })
            
            # Move to next position
            pos += step
        
        return matches
    
    def _calculate_similarity(self, str1: str, str2: str) -> float:
        """
        Calculate similarity between two strings.
        
        Args:
            str1: First string
            str2: Second string
            
        Returns:
            float: Similarity score between 0.0 and 1.0
        """
        # Use difflib's sequence matcher for similarity
        return difflib.SequenceMatcher(None, str1, str2).ratio()
    
    def create_threats_from_detections(self, detections: List[Dict[str, Any]]) -> List[Threat]:
        """
        Create threat objects from leakage detections.
        
        Args:
            detections: Leakage detections
            
        Returns:
            List[Threat]: List of threat objects
        """
        threats = []
        
        for detection in detections:
            # Determine threat type
            if detection["type"] == "sensitive_field_leak":
                threat_type = ThreatType.SENSITIVE_FIELD_LEAK
                description = f"Sensitive field '{detection['field_name']}' leaked to output"
                severity = SecurityLevel.HIGH
            elif detection["type"] == "data_leakage":
                threat_type = ThreatType.DATA_LEAKAGE
                description = f"Exact data leakage detected ({detection['length']} characters)"
                severity = SecurityLevel.MEDIUM
            elif detection["type"] == "fuzzy_data_leakage":
                threat_type = ThreatType.DATA_LEAKAGE
                description = f"Fuzzy data leakage detected (similarity: {detection['similarity']:.2f})"
                severity = SecurityLevel.LOW
            else:
                # Unknown type
                continue
            
            # Create threat object
            threat = Threat(
                type=threat_type,
                severity=severity,
                description=description,
                metadata=detection
            )
            
            threats.append(threat)
        
        return threats
    
    def validate_output(self, input_text: str, output_text: str, 
                        input_data: Dict[str, Any] = None,
                        block_sensitive_leaks: bool = True) -> ValidationResult:
        """
        Validate output for data leakage.
        
        Args:
            input_text: Input prompt text
            output_text: Generated output text
            input_data: Structured input data with field names
            block_sensitive_leaks: Whether to fail validation for sensitive leaks
            
        Returns:
            ValidationResult: Result of validation
        """
        # Detect data leakage
        detections = self.detect_data_leakage(input_text, output_text)
        
        # Also check structured data if provided
        field_leaks = []
        if input_data:
            field_leaks = self.detect_sensitive_field_leakage(input_data, output_text)
        
        # Combine detections
        all_detections = detections + field_leaks
        
        # If no detections, output is valid
        if not all_detections:
            return ValidationResult(
                valid=True,
                issues=[],
                severity=SecurityLevel.LOW,
                metadata={"detections": []}
            )
        
        # Convert detections to threats to determine severity
        threats = self.create_threats_from_detections(all_detections)
        
        # Find highest severity
        highest_severity = max([threat.severity for threat in threats], 
                              key=lambda s: list(SecurityLevel).index(s))
        
        # Determine if output is valid based on severity and block_sensitive_leaks setting
        sensitive_leak = any(threat.type == ThreatType.SENSITIVE_FIELD_LEAK for threat in threats)
        valid = not (block_sensitive_leaks and sensitive_leak)
        
        # Create issue messages
        issues = []
        for threat in threats:
            if threat.type == ThreatType.SENSITIVE_FIELD_LEAK:
                field_name = threat.metadata.get("field_name", "unknown")
                issues.append(f"Sensitive field '{field_name}' leaked to output ({threat.severity.value} severity)")
            elif threat.type == ThreatType.DATA_LEAKAGE:
                length = threat.metadata.get("length", 0)
                issues.append(f"Data leakage detected: {length} characters ({threat.severity.value} severity)")
        
        return ValidationResult(
            valid=valid,
            issues=issues,
            severity=highest_severity,
            metadata={
                "detections": [threat.to_dict() for threat in threats],
                "sensitive_leak_blocked": block_sensitive_leaks and sensitive_leak
            }
        )