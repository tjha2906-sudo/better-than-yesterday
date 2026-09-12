from django.db import models
from django.contrib.auth.models import User


class Activity(models.Model):
    user=models.ForeignKey(User, on_delete=models.CASCADE)
    title=models.CharField(max_length=100)
    category=models.CharField(max_length=100,null=True)
    duration=models.IntegerField()
    completed=models.BooleanField(default=False)
    date=models.DateField(auto_now_add=True)
    

class DailyGoal(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    date = models.DateField()
    activity_target = models.PositiveIntegerField(default=5)
    time_target = models.PositiveIntegerField(default=120)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'date'],
                name='unique_daily_goal_per_user'
            )
        ]

    def __str__(self):
        return f"{self.user.username} - {self.date}"

class FocusSession(models.Model):
    STATUS_CHOICES = [
        ("running", "Running"),
        ("paused", "Paused"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    activity = models.ForeignKey(
        Activity,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="focus_sessions"
    )

    duration = models.PositiveIntegerField(default=25)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="running"
    )

    def __str__(self):
        return f"{self.user.username} - {self.duration} min - {self.status}"