"""
Code Example Generator for creating error handling code examples.
"""

import json
import logging
from typing import Dict, Any, List, Optional

from ..models.troubleshooting_models import (
    ErrorType,
    CodeExample
)
from ..services.llm_service import LLMService
from ..services.knowledge_service import KnowledgeService

logger = logging.getLogger(__name__)


class CodeExampleGenerator:
    """
    Generator for error handling code examples.
    
    This component generates language-specific code examples
    for handling different types of API errors.
    """
    
    def __init__(self, llm_service: LLMService, knowledge_service: KnowledgeService):
        """
        Initialize the Code Example Generator.
        
        Args:
            llm_service: The LLM service for generating code examples
            knowledge_service: The knowledge service for code patterns
        """
        self.llm_service = llm_service
        self.knowledge_service = knowledge_service
        
    def generate(self, language: str, error_type: ErrorType,
                context: Optional[Dict[str, Any]] = None) -> CodeExample:
        """
        Generate a code example for handling a specific error type.
        
        Args:
            language: Programming language (javascript, typescript, python, etc.)
            error_type: Type of error to handle
            context: Additional context for code generation
            
        Returns:
            CodeExample: Code example for handling the error
        """
        context = context or {}
        
        # Try pattern-based generation first
        pattern_example = self._pattern_based_generation(language, error_type, context)
        if pattern_example:
            logger.debug(f"Used pattern-based code example for {language}/{error_type}")
            return pattern_example
        
        # Otherwise, use LLM-based generation
        return self._llm_based_generation(language, error_type, context)
    
    def _pattern_based_generation(self, language: str, error_type: ErrorType,
                                context: Dict[str, Any]) -> Optional[CodeExample]:
        """
        Generate code example based on known patterns.
        
        Args:
            language: Programming language
            error_type: Type of error to handle
            context: Additional context for code generation
            
        Returns:
            Optional[CodeExample]: Code example, or None if no pattern matches
        """
        # Look for matching code samples in the knowledge base
        code_tags = [str(error_type), language]
        code_samples = self.knowledge_service.get_code_samples(code_tags)
        
        if code_samples:
            # Use the highest relevance sample
            sample = max(code_samples, key=lambda s: s.relevance_score)
            
            # Extract code and imports
            code = sample.content
            
            # Simple extraction of import statements
            imports = []
            if language == "javascript" or language == "typescript":
                # Look for import statements in JavaScript/TypeScript
                import_lines = [line for line in code.split("\n") 
                               if line.strip().startswith("import ")]
                imports = [line.strip() for line in import_lines]
            elif language == "python":
                # Look for import statements in Python
                import_lines = [line for line in code.split("\n") 
                               if line.strip().startswith("import ") or line.strip().startswith("from ")]
                imports = [line.strip() for line in import_lines]
            
            # Create code example
            return CodeExample(
                language=language,
                error_type=error_type,
                code=code,
                explanation=f"This example demonstrates how to handle {error_type} errors in {language}.",
                imports=imports,
                dependencies=[],
                context=context
            )
        
        # Check for hard-coded examples for common scenarios
        
        if language == "javascript" and error_type == ErrorType.AUTHENTICATION:
            code = """
            async function authenticateWithRetry(credentials, maxRetries = 3) {
              let retries = 0;
              
              while (retries < maxRetries) {
                try {
                  const response = await api.authenticate(credentials);
                  return response.token;
                } catch (error) {
                  retries++;
                  if (error.status === 401) {
                    console.log(`Authentication failed, attempt ${retries} of ${maxRetries}`);
                    if (retries >= maxRetries) {
                      throw new Error('Authentication failed after maximum retry attempts');
                    }
                    // Slight delay before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000));
                  } else {
                    throw error; // Rethrow if it's not an auth error
                  }
                }
              }
            }
            """
            explanation = (
                "This function attempts to authenticate with retry logic. If authentication fails with "
                "a 401 error, it will retry up to the specified maximum number of retries with a delay "
                "between attempts. Other errors are rethrown immediately."
            )
            return CodeExample(
                language=language,
                error_type=error_type,
                code=code,
                explanation=explanation,
                imports=[],
                dependencies=[],
                context=context
            )
            
        elif language == "javascript" and error_type == ErrorType.RATE_LIMIT:
            code = """
            class RateLimitedApiClient {
              constructor(baseUrl, options = {}) {
                this.baseUrl = baseUrl;
                this.maxRetries = options.maxRetries || 5;
                this.baseDelay = options.baseDelay || 1000;
                this.maxDelay = options.maxDelay || 30000;
              }
              
              async request(endpoint, options = {}) {
                let retries = 0;
                
                while (true) {
                  try {
                    const response = await fetch(`${this.baseUrl}/${endpoint}`, options);
                    
                    if (response.status === 429) {
                      retries++;
                      if (retries > this.maxRetries) {
                        throw new Error('Rate limit exceeded maximum retries');
                      }
                      
                      // Exponential backoff
                      const delay = Math.min(
                        Math.pow(2, retries) * this.baseDelay, 
                        this.maxDelay
                      );
                      
                      console.log(`Rate limited, retrying in ${delay}ms`);
                      await new Promise(resolve => setTimeout(resolve, delay));
                      continue;
                    }
                    
                    return response;
                  } catch (error) {
                    if (retries >= this.maxRetries) {
                      throw error;
                    }
                    retries++;
                  }
                }
              }
            }
            """
            explanation = (
                "This class implements an API client with built-in rate limiting handling. When a 429 "
                "Too Many Requests response is received, it implements exponential backoff to wait "
                "progressively longer before retrying, up to a maximum delay."
            )
            return CodeExample(
                language=language,
                error_type=error_type,
                code=code,
                explanation=explanation,
                imports=[],
                dependencies=[],
                context=context
            )
            
        elif language == "python" and error_type == ErrorType.AUTHENTICATION:
            code = """
            import time
            import requests
            from typing import Dict, Any
            
            def authenticate_with_retry(credentials: Dict[str, Any], max_retries: int = 3) -> str:
                # Authenticate with retry logic for handling auth failures
                retries = 0
                
                while retries < max_retries:
                    try:
                        response = requests.post("https://api.provider.com/auth", json=credentials)
                        response.raise_for_status()
                        return response.json()["token"]
                    except requests.exceptions.HTTPError as e:
                        retries += 1
                        if e.response.status_code == 401:
                            print(f"Authentication failed, attempt {retries} of {max_retries}")
                            if retries >= max_retries:
                                raise Exception("Authentication failed after maximum retry attempts")
                            # Slight delay before retrying
                            time.sleep(1)
                        else:
                            raise  # Rethrow if it's not an auth error
            """
            explanation = (
                "This function attempts to authenticate with the API, with retry logic for handling "
                "authentication failures. If a 401 error occurs, it will retry up to the maximum "
                "number of attempts with a delay between tries. Other HTTP errors are re-raised immediately."
            )
            return CodeExample(
                language=language,
                error_type=error_type,
                code=code,
                explanation=explanation,
                imports=["import time", "import requests", "from typing import Dict, Any"],
                dependencies=["requests"],
                context=context
            )
            
        elif language == "python" and error_type == ErrorType.RATE_LIMIT:
            code = """
            import time
            import math
            import requests
            from typing import Dict, Any, Optional
            
            class RateLimitedApiClient:
                # API client with built-in rate limiting handling
                
                def __init__(self, base_url: str, **options):
                    self.base_url = base_url
                    self.max_retries = options.get("max_retries", 5)
                    self.base_delay = options.get("base_delay", 1.0)
                    self.max_delay = options.get("max_delay", 30.0)
                    self.session = requests.Session()
                    
                def request(self, method: str, endpoint: str, 
                           params: Optional[Dict[str, Any]] = None,
                           json: Optional[Dict[str, Any]] = None,
                           **kwargs) -> requests.Response:
                    # Make a request with rate limit handling
                    retries = 0
                    url = f"{self.base_url}/{endpoint}"
                    
                    while True:
                        try:
                            response = self.session.request(
                                method, url, params=params, json=json, **kwargs
                            )
                            
                            if response.status_code == 429:
                                retries += 1
                                if retries > self.max_retries:
                                    raise Exception("Rate limit exceeded maximum retries")
                                
                                # Exponential backoff
                                delay = min(
                                    math.pow(2, retries) * self.base_delay,
                                    self.max_delay
                                )
                                
                                print(f"Rate limited, retrying in {delay}s")
                                time.sleep(delay)
                                continue
                                
                            response.raise_for_status()
                            return response
                        except requests.exceptions.RequestException as e:
                            if retries >= self.max_retries:
                                raise
                            retries += 1
            """
            explanation = (
                "This class implements an API client with built-in rate limiting handling. When a 429 "
                "Too Many Requests response is received, it implements exponential backoff to wait "
                "progressively longer before retrying, up to a maximum delay and retry count."
            )
            return CodeExample(
                language=language,
                error_type=error_type,
                code=code,
                explanation=explanation,
                imports=[
                    "import time", 
                    "import math", 
                    "import requests", 
                    "from typing import Dict, Any, Optional"
                ],
                dependencies=["requests"],
                context=context
            )
            
        elif language == "typescript" and error_type == ErrorType.AUTHENTICATION:
            code = """
            async function authenticateWithRetry(
              credentials: {username: string, password: string},
              maxRetries: number = 3
            ): Promise<string> {
              let retries = 0;
              
              while (retries < maxRetries) {
                try {
                  const response = await api.authenticate(credentials);
                  return response.token;
                } catch (error) {
                  retries++;
                  // TypeScript type narrowing
                  if (error instanceof Error && 'status' in error && error.status === 401) {
                    console.log(`Authentication failed, attempt ${retries} of ${maxRetries}`);
                    if (retries >= maxRetries) {
                      throw new Error('Authentication failed after maximum retry attempts');
                    }
                    // Slight delay before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000));
                  } else {
                    throw error; // Rethrow if it's not an auth error
                  }
                }
              }
              
              // This should never be reached due to the while loop and error throwing
              throw new Error('Unexpected end of authentication flow');
            }
            """
            explanation = (
                "This TypeScript function attempts to authenticate with the API, with retry logic for "
                "handling authentication failures. It includes proper type annotations and type narrowing "
                "for the error handling."
            )
            return CodeExample(
                language=language,
                error_type=error_type,
                code=code,
                explanation=explanation,
                imports=[],
                dependencies=[],
                context=context
            )
        
        # No pattern match
        return None
    
    def _llm_based_generation(self, language: str, error_type: ErrorType,
                            context: Dict[str, Any]) -> CodeExample:
        """
        Generate code example using the LLM.
        
        Args:
            language: Programming language
            error_type: Type of error to handle
            context: Additional context for code generation
            
        Returns:
            CodeExample: Code example for handling the error
        """
        # Create prompt for the LLM
        provider = context.get("provider", "API")
        operation = context.get("operation", "operation")
        
        prompt = (
            f"Generate a code example in {language} for handling {error_type} errors "
            f"when working with the {provider} API, specifically for the {operation} operation.\n\n"
            f"Additional context: {json.dumps(context)}\n\n"
            f"Include best practices like exponential backoff, proper error handling, and "
            f"clear comments. The code should be production-ready and follow modern {language} conventions."
        )
        
        # Query the LLM
        response = self.llm_service.query(
            prompt=prompt,
            system_prompt=(
                f"You are an expert {language} developer specializing in API integration. "
                f"Generate high-quality, production-ready code examples that demonstrate "
                f"best practices for handling API errors. Focus on clarity, efficiency, "
                f"and proper error handling."
            ),
            temperature=0.2
        )
        
        # Extract code and explanation
        code, explanation = self._extract_code_and_explanation(response, language)
        
        # Extract imports
        imports = self._extract_imports(code, language)
        
        # Identify dependencies
        dependencies = self._identify_dependencies(code, language)
        
        # Create code example
        return CodeExample(
            language=language,
            error_type=error_type,
            code=code,
            explanation=explanation,
            imports=imports,
            dependencies=dependencies,
            context=context
        )
    
    def _extract_code_and_explanation(self, response: str, language: str) -> Tuple[str, str]:
        """
        Extract code and explanation from an LLM response.
        
        Args:
            response: The LLM response
            language: The programming language
            
        Returns:
            Tuple[str, str]: The extracted code and explanation
        """
        # Check for Markdown code blocks
        code_block_start = response.find("```" + language)
        if code_block_start >= 0:
            code_start = response.find("\n", code_block_start) + 1
            code_end = response.find("```", code_start)
            if code_end >= 0:
                code = response[code_start:code_end].strip()
                
                # Extract explanation from text before or after the code block
                if code_block_start > 10:  # Explanation before code
                    explanation = response[:code_block_start].strip()
                else:  # Explanation after code
                    explanation_start = response.find("```", code_end + 3)
                    if explanation_start >= 0:
                        explanation = response[explanation_start + 3:].strip()
                    else:
                        explanation = response[code_end + 3:].strip()
                
                return code, explanation
        
        # No Markdown code block, try to extract based on indentation or language-specific patterns
        if language in ["python", "javascript", "typescript"]:
            # Look for common function/class definitions
            code_starters = [
                "function ", "class ", "const ", "let ", "var ", "async function",
                "def ", "class ", "async def", "from ", "import "
            ]
            
            for starter in code_starters:
                pos = response.find(starter)
                if pos >= 0:
                    # Assume everything from this point is code
                    code = response[pos:].strip()
                    explanation = response[:pos].strip()
                    return code, explanation
        
        # Fallback: assume first paragraph is explanation, rest is code
        paragraphs = response.split("\n\n")
        if len(paragraphs) > 1:
            explanation = paragraphs[0].strip()
            code = "\n\n".join(paragraphs[1:]).strip()
        else:
            # Can't clearly separate, return whole response as code
            code = response.strip()
            explanation = f"Code example for handling {language} {language} errors."
        
        return code, explanation
    
    def _extract_imports(self, code: str, language: str) -> List[str]:
        """
        Extract import statements from code.
        
        Args:
            code: The code to extract imports from
            language: The programming language
            
        Returns:
            List[str]: The extracted import statements
        """
        imports = []
        
        if language in ["javascript", "typescript"]:
            # Extract JavaScript/TypeScript imports
            lines = code.split("\n")
            for line in lines:
                line = line.strip()
                if line.startswith("import ") or line.startswith("require("):
                    imports.append(line)
        elif language == "python":
            # Extract Python imports
            lines = code.split("\n")
            for line in lines:
                line = line.strip()
                if line.startswith("import ") or line.startswith("from "):
                    imports.append(line)
        
        return imports
    
    def _identify_dependencies(self, code: str, language: str) -> List[str]:
        """
        Identify external dependencies used in the code.
        
        Args:
            code: The code to analyze
            language: The programming language
            
        Returns:
            List[str]: The identified dependencies
        """
        dependencies = []
        
        if language in ["javascript", "typescript"]:
            # Identify JavaScript/TypeScript dependencies
            common_js_libs = [
                "axios", "node-fetch", "fetch", "request", "superagent", "got",
                "express", "koa", "lodash", "underscore", "moment", "date-fns"
            ]
            
            for lib in common_js_libs:
                if f"from '{lib}'" in code or f'from "{lib}"' in code or f"require('{lib}')" in code or f'require("{lib}")' in code:
                    dependencies.append(lib)
        elif language == "python":
            # Identify Python dependencies
            common_py_libs = [
                "requests", "aiohttp", "httpx", "urllib3", "pandas", "numpy",
                "flask", "django", "fastapi", "sqlalchemy", "pydantic", "datetime"
            ]
            
            for lib in common_py_libs:
                if f"import {lib}" in code or f"from {lib}" in code:
                    dependencies.append(lib)
        
        return dependencies