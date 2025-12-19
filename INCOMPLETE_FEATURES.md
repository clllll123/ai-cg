# Incomplete Features & Development Status

This document outlines the current state of features in the Post-Login Interface (Dashboard and Game System), highlighting areas that require further development or are currently using placeholder data.

## 1. Dashboard Interface (`pages/dashboard/Dashboard.tsx`)

### Navigation & Routing
- **Sidebar Buttons**: The following sidebar items are currently UI placeholders and do not navigate to functional pages:
  - **排行榜 (Leaderboard)**: No dedicated leaderboard page.
  - **任务中心 (Task Center)**: No dedicated tasks page.
  - **课程管理/我的课程 (Course Management)**: No dedicated course management system.

### Social & Community
- **Community Activity**: The "社区动态" section displays a static hardcoded message ("暂无最新动态..."). It is not connected to any backend social feed or activity log.

### Gamification Elements
- **Global Leaderboard**: The leaderboard widget on the dashboard displays **mocked data** with random usernames (`User_1234`) and scores. It does not reflect real player rankings from the database.
- **Daily Tasks**: The "每日任务" list contains hardcoded task items with static completion statuses. The task tracking system is not fully implemented.

### User Statistics
- **Yield Calculation**: The "Total Yield" (总收益率) is hardcoded to `+12.5%`.
- **Game History**: While `totalGames` and `wins` are read from the user context, full integration with the backend for persistent historical game data validation is needed.

## 2. Game Interface (`components/MobileInterface.tsx` & `LegacyGame.tsx`)

### Player Client
- **State Management**: The "RELOAD APP" button in the "Me" tab uses a full page reload (`window.location.reload()`). A more graceful state reset mechanism is recommended.
- **Network Status**: The network signal indicator is simulated based on local sync timers.

### Game Logic & Data
- **Market Data**: Order book data (`buyBook`, `sellBook`) and advanced financial metrics (EPS, P/E) rely on the simulation engine. Ensure the backend simulation populates these fields accurately for a realistic experience.

## 3. General Recommendations for Next Steps

1.  **Implement Dashboard Routes**: Create dedicated pages for Leaderboard, Tasks, and Course Management to make sidebar buttons functional.
2.  **Connect Real Data**: Replace mock data in the Dashboard leaderboard and tasks with API calls to the backend.
3.  **Enhance Social Features**: Implement a simple activity feed or remove the placeholder if not in immediate scope.
4.  **Refine Navigation**: Ensure consistent use of `useNavigate` instead of `window.location` or `href` anchors to maintain Single Page Application (SPA) state.

---
*Last Updated: 2025-12-19*
