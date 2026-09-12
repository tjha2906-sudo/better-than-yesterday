from datetime import date,timedelta
from django.utils import timezone

from core.serializers import ActivitySerializer,RegisterSerializer,DailyGoalSerializer,FocusSessionSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from core.models import Activity,DailyGoal,FocusSession
from rest_framework import status  
from django.http import Http404
from core.services import (
    calculate_completion_score,
    calculate_consistency_score,
    calculate_time_score,
    calculate_improvement,
    calculate_weekly_scores,
    calculate_weekly_average,
    calculate_best_worst_day,
    calculate_current_streak,
    calculate_category_stats,
    calculate_achievements,
    calculate_productivity_heatmap
)
from rest_framework.permissions import IsAuthenticated,AllowAny


class ActivityList(APIView):
    permission_classes = [IsAuthenticated] 
    
    def get(self, request):
        activities=Activity.objects.filter(user=request.user)
        serializer=ActivitySerializer(activities, many=True)
        return Response(serializer.data,status=status.HTTP_200_OK)

    def post(self,request):
        serializer=ActivitySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data,status=status.HTTP_201_CREATED)
        return Response(serializer.errors,status=status.HTTP_400_BAD_REQUEST)

class TodayActivityList(APIView):
        permission_classes = [IsAuthenticated]
        def get(self,request): 
            Activities=Activity.objects.filter(user=request.user,date=date.today())
            serializer=ActivitySerializer(Activities,many=True)
            return Response(serializer.data,status=status.HTTP_200_OK)  
        

class ActivityDetail(APIView):
    permission_classes = [IsAuthenticated]
    def get_object(self,pk,request):
        try:
            return Activity.objects.get(pk=pk,user=request.user)
        except Activity.DoesNotExist:
            raise Http404

    def get(self,request,pk):
        activity=self.get_object(pk,request) 
        serializer=ActivitySerializer(activity)
        return Response(serializer.data,status=status.HTTP_200_OK)

    def put(self,request,pk):
        activity=self.get_object(pk,request) 
        serializer=ActivitySerializer(activity,data=request.data)
        if serializer.is_valid():
            serializer.save() 
            return Response(serializer.data,status=status.HTTP_200_OK)
        return Response(serializer.errors,status=status.HTTP_400_BAD_REQUEST)

    def delete(self,request,pk):
        activity=self.get_object(pk,request) 
        activity.delete()
        return Response(status=status.HTTP_204_NO_CONTENT) 

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "User registered successfully"},
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

class DashboardView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self,request):
        activities=Activity.objects.filter(user=request.user,date=date.today())
        completion_score=calculate_completion_score(activities)
        consistency_score = calculate_consistency_score(request.user,date.today())
        time_score = calculate_time_score(activities)
        improvement = calculate_improvement(request.user) 
        total_score = completion_score + time_score + consistency_score
        weekly_scores = calculate_weekly_scores(request.user)
        weekly_average = calculate_weekly_average(request.user)
        best_worst = calculate_best_worst_day(request.user)
        current_streak = calculate_current_streak(request.user)
        category_stats = calculate_category_stats(request.user)

        return Response(
    {
        "completion_score": completion_score,
        "time_score": time_score,
        "consistency_score": consistency_score,
        "total_score": total_score,
        "improvement": improvement,
        "weekly_scores": weekly_scores,
        "weekly_average": weekly_average,
        "best_day": best_worst["best_day"],
        "worst_day": best_worst["worst_day"],
        "current_streak": current_streak,
        "category_stats": category_stats 
    },
    status=status.HTTP_200_OK
)


class ProductivityComparisonView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = date.today()
        yesterday = today - timedelta(days=1)

        today_activities = Activity.objects.filter(
            user=request.user,
            date=today
        )

        yesterday_activities = Activity.objects.filter(
            user=request.user,
            date=yesterday
        )

        today_total = today_activities.count()
        today_completed = today_activities.filter(completed=True).count()

        yesterday_total = yesterday_activities.count()
        yesterday_completed = yesterday_activities.filter(completed=True).count()

        today_score = (
            (today_completed / today_total) * 100
            if today_total > 0 else 0
        )

        yesterday_score = (
            (yesterday_completed / yesterday_total) * 100
            if yesterday_total > 0 else 0
        )

        difference = today_score - yesterday_score

        return Response({
            "today": round(today_score, 2),
            "yesterday": round(yesterday_score, 2),
            "difference": round(difference, 2)
        })

class AchievementsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        achievements = calculate_achievements(request.user)

        return Response(
            {
                "achievements": achievements
            },
            status=status.HTTP_200_OK
        ) 

class DailyGoalView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = date.today()

        goal, created = DailyGoal.objects.get_or_create(
            user=request.user,
            date=today
        )

        activities = Activity.objects.filter(
            user=request.user,
            date=today,
            completed=True
        )

        completed_activities = activities.count()
        completed_time = sum(activity.duration for activity in activities)

        activity_progress = (
            (completed_activities / goal.activity_target) * 100
            if goal.activity_target > 0 else 0
        )

        time_progress = (
            (completed_time / goal.time_target) * 100
            if goal.time_target > 0 else 0
        )

        return Response({
            "id": goal.id,
            "date": goal.date,
            "activity_target": goal.activity_target,
            "time_target": goal.time_target,
            "completed_activities": completed_activities,
            "completed_time": completed_time,
            "activity_progress": round(min(activity_progress, 100), 2),
            "time_progress": round(min(time_progress, 100), 2),
        }, status=status.HTTP_200_OK)

    def post(self, request):
        today = date.today()

        goal, created = DailyGoal.objects.get_or_create(
            user=request.user,
            date=today
        )

        serializer = DailyGoalSerializer(
            goal,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save(user=request.user, date=today)

            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def put(self, request):
        today = date.today()

        goal, created = DailyGoal.objects.get_or_create(
            user=request.user,
            date=today
        )

        serializer = DailyGoalSerializer(
            goal,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save(user=request.user, date=today)

            return Response(
                serializer.data,
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

class FocusSessionStartView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        duration = int(request.data.get("duration", 25))
        activity_id = request.data.get("activity_id")

        if duration < 1:
            return Response(
                {"detail": "Duration must be at least 1 minute."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Prevent multiple active sessions
        active_session = FocusSession.objects.filter(
            user=request.user,
            status__in=["running", "paused"]
        ).first()

        if active_session:
            return Response(
                {
                    "detail": "You already have an active focus session.",
                    "session": FocusSessionSerializer(active_session).data
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        activity = None

        if activity_id:
            try:
                activity = Activity.objects.get(
                    id=activity_id,
                    user=request.user
                )
            except Activity.DoesNotExist:
                return Response(
                    {"detail": "Activity not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

        session = FocusSession.objects.create(
            user=request.user,
            activity=activity,
            duration=duration,
            status="running"
        )

        return Response(
            FocusSessionSerializer(session).data,
            status=status.HTTP_201_CREATED
        )


class FocusSessionPauseView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            session = FocusSession.objects.get(
                id=pk,
                user=request.user
            )
        except FocusSession.DoesNotExist:
            return Response(
                {"detail": "Focus session not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if session.status != "running":
            return Response(
                {"detail": "Only a running session can be paused."},
                status=status.HTTP_400_BAD_REQUEST
            )

        session.status = "paused"
        session.save(update_fields=["status"])

        return Response(FocusSessionSerializer(session).data)


class FocusSessionResumeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            session = FocusSession.objects.get(
                id=pk,
                user=request.user
            )
        except FocusSession.DoesNotExist:
            return Response(
                {"detail": "Focus session not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if session.status != "paused":
            return Response(
                {"detail": "Only a paused session can be resumed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        session.status = "running"
        session.save(update_fields=["status"])

        return Response(FocusSessionSerializer(session).data)


class FocusSessionCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            session = FocusSession.objects.get(
                id=pk,
                user=request.user
            )
        except FocusSession.DoesNotExist:
            return Response(
                {"detail": "Focus session not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if session.status == "completed":
            return Response(
                {"detail": "Focus session is already completed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if session.status == "cancelled":
            return Response(
                {"detail": "Cancelled session cannot be completed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        session.status = "completed"
        session.completed_at = timezone.now()
        session.save(update_fields=["status", "completed_at"])

        # If linked to an activity, mark that activity completed
        if session.activity:
            session.activity.completed = True
            session.activity.duration = session.duration
            session.activity.save(
                update_fields=["completed", "duration"]
            )

        # Otherwise create a Focus activity
        else:
            activity = Activity.objects.create(
                user=request.user,
                title="Focus Session",
                category="Focus",
                duration=session.duration,
                completed=True
            )

            session.activity = activity
            session.save(update_fields=["activity"])

        return Response(
            {
                "message": "Focus session completed successfully.",
                "session": FocusSessionSerializer(session).data,
                "activity": ActivitySerializer(session.activity).data
            },
            status=status.HTTP_200_OK
        )


class FocusSessionCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            session = FocusSession.objects.get(
                id=pk,
                user=request.user
            )
        except FocusSession.DoesNotExist:
            return Response(
                {"detail": "Focus session not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if session.status == "completed":
            return Response(
                {"detail": "Completed session cannot be cancelled."},
                status=status.HTTP_400_BAD_REQUEST
            )

        session.status = "cancelled"
        session.completed_at = timezone.now()
        session.save(update_fields=["status", "completed_at"])

        return Response(
            {
                "message": "Focus session cancelled.",
                "session": FocusSessionSerializer(session).data
            }
        )


class FocusSessionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = FocusSession.objects.filter(
            user=request.user
        ).order_by("-started_at")

        serializer = FocusSessionSerializer(
            sessions,
            many=True
        )

        return Response(serializer.data)


class ProductivityHeatmapView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        heatmap = calculate_productivity_heatmap(
            request.user,
            days=365
        )

        return Response({
            "days": heatmap
        }) 



