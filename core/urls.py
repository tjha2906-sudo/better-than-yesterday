from django.urls import path
from . import views

urlpatterns = [
    path('activities/', views.ActivityList.as_view()),
    path('activities/today/', views.TodayActivityList.as_view()),
    path('activities/<int:pk>/', views.ActivityDetail.as_view()),
    path('dashboard/', views.DashboardView.as_view()),
    path('dashboard/comparison/', views.ProductivityComparisonView.as_view()),
    path('register/', views.RegisterView.as_view()),
    path('goals/today/', views.DailyGoalView.as_view()),
    path('achievements/', views.AchievementsView.as_view()),
    path('focus/start/', views.FocusSessionStartView.as_view()),
    path('focus/', views.FocusSessionListView.as_view()),
    path('focus/<int:pk>/pause/', views.FocusSessionPauseView.as_view()),
    path('focus/<int:pk>/resume/', views.FocusSessionResumeView.as_view()),
    path('focus/<int:pk>/complete/', views.FocusSessionCompleteView.as_view()),
    path('focus/<int:pk>/cancel/', views.FocusSessionCancelView.as_view()),
    path('productivity-heatmap/',views.ProductivityHeatmapView.as_view())
]