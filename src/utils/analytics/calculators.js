export const AnalyticsCalculators = {
    // חישוב מדדי המרה
    calculateConversionRate(stats) {
      if (!stats.dailyStats.totalViews) return 0;
      return (stats.dailyStats.totalClicks / stats.dailyStats.totalViews) * 100;
    },
  
    // חישוב זמן צפייה ממוצע
    calculateAverageViewTime(stats) {
      if (!stats.dailyStats.totalViews) return 0;
      return stats.dailyStats.totalViewTime / stats.dailyStats.totalViews;
    },
  
    // זיהוי שעות שיא
    findPeakHours(stats) {
      return stats.hourlyStats
        .sort((a, b) => b.views - a.views)
        .slice(0, 3)
        .map(stat => stat.hour);
    }
  };