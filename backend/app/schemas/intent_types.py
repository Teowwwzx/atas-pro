from enum import Enum

class IntentType(str, Enum):
    """Standard user intent types for profile badges"""
    OPEN_TO_SPEAK = "open_to_speak"
    LOOKING_FOR_SPEAKER = "looking_for_speaker"
    OPEN_TO_SPONSOR = "open_to_sponsor"
    LOOKING_FOR_SPONSOR = "looking_for_sponsor"
    OPEN_TO_JOB = "open_to_job"
    HIRING_TALENT = "hiring_talent"
    
    @classmethod
    def values(cls):
        return [item.value for item in cls]
