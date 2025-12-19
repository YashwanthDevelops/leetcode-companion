from datetime import datetime, timedelta

class SpacedRepetitionService:
    @staticmethod
    def calculate_next_review(quality: int, ease_factor: float = 2.5, interval: int = 0, repetitions: int = 0):
        """
        quality: 0-5 (0=Forgot, 5=Perfect)
        ease_factor: Default 2.5
        interval: Days until next review
        repetitions: Number of times successfully reviewed
        """
        if quality < 3:
            # If the user failed, reset the interval but keep the repetitions? 
            # Original SM-2 says reset reps to 1 or 0 usually. 
            # The prompt provided: return 1, 2.5, 0 (Wait, prompt code: return 1, 2.5, 0 -- so reset everything?)
            # Prompt code says: return 1, 2.5, 0. I will follow prompt.
             return 1, 2.5, 0 
        
        if repetitions == 0:
            interval = 1
        elif repetitions == 1:
            interval = 6
        else:
            interval = round(interval * ease_factor)
            
        # Update Ease Factor
        ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        ease_factor = max(1.3, ease_factor) # EF never goes below 1.3
        
        return interval, ease_factor, repetitions + 1
