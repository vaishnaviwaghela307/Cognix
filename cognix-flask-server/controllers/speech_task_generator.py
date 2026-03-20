"""
Dynamic Speech Task Generation Service
Uses GROQ AI to generate unique and engaging speech assessment tasks
"""

import json
import logging
from groq import Groq

logger = logging.getLogger(__name__)

class SpeechTaskGenerator:
    """Generate dynamic speech assessment tasks using GROQ AI"""
    
    @staticmethod
    def generate_tasks(api_key):
        """
        Generate dynamic speech tasks using GROQ AI
        
        Args:
            api_key: GROQ API key
        
        Returns:
            list: List of generated SpeechTask objects
        """
        
        client = Groq(api_key=api_key)
        
        prompt = """You are a clinical neuro-linguistic expert. 
Generate exactly 3 diverse and engaging speech assessment tasks to detect early signs of Alzheimer's and Parkinson's.

TASK TYPES REQUIRED:
1. 'description': Narrative task (e.g., describing a scene, a memory, or a process). Focus on coherent logical flow.
2. 'counting': Cognitive cognitive task (e.g., reverse counting by complex intervals, spelling words backwards). Focus on working memory.
3. 'naming': Semantic fluency task (e.g., naming items in a specific category). Focus on semantic retrieval speed.

REQUIREMENTS:
- Tasks must be "easy" for a healthy adult but challenging enough to reveal subtle cognitive friction.
- Instructions must be ultra-clear and direct.
- Use a friendly, encouraging tone.
- Each task should have: id (string), title, description, instruction, icon (Ionicons name), and type (one of: description, counting, naming).

Return ONLY a JSON object with a "tasks" array containing exactly 3 tasks.

Example structure:
{
  "tasks": [
    {
      "id": "task_1",
      "title": "...",
      "description": "...",
      "instruction": "...",
      "icon": "vibrant-icon-name",
      "type": "description"
    },
    ...
  ]
}

Generate the tasks now:"""

        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are a clinical AI that generates patient-friendly speech assessment tasks. Always respond with valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=800,
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            parsed = json.loads(content)
            tasks = parsed.get('tasks', [])
            
            if len(tasks) >= 3:
                return tasks[:3]
            else:
                return SpeechTaskGenerator.get_default_tasks()
                
        except Exception as e:
            logger.error(f"GROQ Speech Task Generation error: {str(e)}")
            return SpeechTaskGenerator.get_default_tasks()

    @staticmethod
    def get_default_tasks():
        """Fallback default speech tasks"""
        return [
            {
                "id": "default_1",
                "title": "Memorable Meal",
                "description": "Describe your favorite meal that you've ever had in detail.",
                "instruction": "Speak for at least 30 seconds. Describe the taste, location, and who you were with.",
                "icon": "restaurant",
                "type": "description"
            },
            {
                "id": "default_2",
                "title": "Reverse Steps",
                "description": "Count backwards from 50 to 0 but only say every 3rd number (50, 47, 44...)",
                "instruction": "This tests your concentration and working memory. Take your time.",
                "icon": "footsteps",
                "type": "counting"
            },
            {
                "id": "default_3",
                "title": "Garden Party",
                "description": "Name as many flowers or plants as you can think of in 30 seconds.",
                "instruction": "Speed is important here. Don't worry if you skip some!",
                "icon": "flower",
                "type": "naming"
            }
        ]
