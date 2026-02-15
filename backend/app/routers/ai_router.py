from fastapi import APIRouter, Depends, Body
from app.schemas.ai_schema import ProposalRequest, ProposalResponse
from app.dependencies import get_current_user, get_current_user_optional
from app.models.user_model import User
from app.services.ai_service import generate_simple_content
from pydantic import BaseModel

router = APIRouter()

class TextGenerationRequest(BaseModel):
    prompt: str
    context: str | None = None

class TextGenerationResponse(BaseModel):
    result: str

@router.post("/generate-text", response_model=TextGenerationResponse)
def generate_ai_text(
    req: TextGenerationRequest, 
    current_user: User = Depends(get_current_user)
):
    full_prompt = req.prompt
    if req.context:
        full_prompt += f"\n\nContext:\n{req.context}"
    
    result = generate_simple_content(full_prompt)
    return TextGenerationResponse(result=result)

@router.post("/generate-proposal", response_model=ProposalResponse)
def generate_proposal(
    req: ProposalRequest, 
    current_user: User | None = Depends(get_current_user_optional)  # Allow unauthenticated access
):
    """Generate AI-powered expert invitation proposal using Gemini"""
    
    # Handle both authenticated and unauthenticated users
    if current_user:
        name = req.student_name or current_user.email
    else:
        name = req.student_name or "Event Organizer"
    
    # Use Gemini AI for intelligent proposal generation
    prompt = f"""You are an expert academic event coordinator. Generate a concise, professional invitation email to invite an expert speaker.

Expert Name: {req.expert_name}
Topic: {req.topic}
Organizer Name: {name}

Create a warm, professional invitation that:
1. Briefly introduces the organizer and purpose
2. Explains why this expert is chosen for this specific topic
3. Suggests a simple agenda: Introduction (5 min), Main Talk (40 min), Q&A (15 min)
4. Expresses genuine interest in their participation

IMPORTANT CONSTRAINTS:
- Keep it CONCISE: 100-150 words maximum
- Do NOT include placeholder text like [Institution Name], [Phone Number], [Date], etc.
- Only mention information that is actually provided
- Skip any tables, complex formatting, or unnecessary details
- Write as a complete, ready-to-send email
- Be genuine and respectful, not overly formal"""

    try:
        result = generate_simple_content(prompt)
        
        # Extract title from first line or generate one
        lines = result.split('\n')
        title = f"Invitation: {req.topic}"
        
        # If Gemini included a subject line, use it
        if lines and ('subject' in lines[0].lower() or 'invitation' in lines[0].lower()):
            title = lines[0].replace('Subject:', '').replace('subject:', '').strip()
            result = '\n'.join(lines[1:]).strip()
        
        return ProposalResponse(title=title, description=result)
        
    except Exception as e:
        # Fallback to enhanced template if AI fails
        print(f"AI proposal generation failed: {e}")
        template = (f"Dear {req.expert_name},\n\n"
                   f"I am {name}, and I am writing to invite you to share your expertise at our upcoming event.\n\n"
                   f"We are organizing a session on '{req.topic}' and believe your insights would be invaluable "
                   f"to our audience. Your experience and knowledge in this area make you the ideal speaker.\n\n"
                   f"**Proposed Agenda:**\n"
                   f"• Introduction & Welcome (5 minutes)\n"
                   f"• Keynote: {req.topic} (40 minutes)\n"
                   f"• Interactive Q&A Session (15 minutes)\n\n"
                   f"We would be honored by your participation and look forward to your positive response.\n\n"
                   f"Warm regards,\n{name}")
        
        return ProposalResponse(title=f"Invitation to speak on {req.topic}", description=template)
