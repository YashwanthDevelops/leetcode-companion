from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

security = HTTPBearer(auto_error=False)

def get_supabase_client() -> Client:
    """
    Create and return a Supabase client using environment variables.
    
    Returns:
        Client: Supabase client instance
    
    Raises:
        ValueError: If required environment variables are not set
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        raise ValueError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables"
        )
    
    return create_client(url, key)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client)
) -> dict:
    """
    Validate Supabase JWT token and return user data.
    
    Args:
        credentials: HTTP Bearer token from Authorization header
        supabase: Supabase client instance
    
    Returns:
        dict: User data containing id, email, created_at
    
    Raises:
        HTTPException: 401 if authentication fails
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = credentials.credentials
    
    try:
        # Verify token with Supabase
        user_response = supabase.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        
        return {
            "id": user_response.user.id,
            "email": user_response.user.email,
            "created_at": str(user_response.user.created_at) if user_response.user.created_at else None
        }
        
    except Exception as e:
        # Handle Supabase-specific errors
        error_message = str(e)
        if "Invalid token" in error_message or "expired" in error_message.lower():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client)
) -> dict | None:
    """
    Optional authentication - returns None if not authenticated.
    Useful for endpoints that work with or without auth.
    
    Args:
        credentials: HTTP Bearer token from Authorization header
        supabase: Supabase client instance
    
    Returns:
        dict | None: User data if authenticated, None otherwise
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials, supabase)
    except HTTPException:
        return None
