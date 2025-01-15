import { UserInterestsService } from '../../services/analytics/userInterests.service.js';

export const UserInterestsController = {
  // קבלת תחומי עניין של המשתמש
  async getUserInterests(req, res) {
    try {
      const userId = req.user.id;
      const interests = await UserInterestsService.getUserInterests(userId);
      
      res.json({ success: true, interests });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }
};