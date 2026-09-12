from core.models import Activity 
from datetime import date ,timedelta
from django.db.models import Sum

def calculate_completion_score(activities):
    total_activities=activities.count()
    if(total_activities==0):
        return 0 
    
    completed=activities.filter(completed=True) 
    completed_activities=completed.count()

    score = (completed_activities / total_activities) * 50

    return score 

def calculate_time_score(activities):
    completed=activities.filter(completed=True) 
    total_duration=0

    for activity in completed:
        duration=activity.duration
        total_duration+=duration 

    time_score = min(total_duration / 120, 1) * 30

    return time_score 



def calculate_consistency_score(user,target_date):
    start_date = target_date- timedelta(days=6)

    productive_days = (
        Activity.objects
        .filter(
            user=user,
            date__range=[start_date, target_date],
            completed=True
        )
        .values('date')
        .distinct()
        .count()
    )

    consistency_score = (productive_days / 7) * 20

    return consistency_score

def calculate_improvement(user):
    today = date.today()
    yesterday = today - timedelta(days=1)

    today_activities=Activity.objects.filter(
        user=user,
        date=today 

    )

    yesterday_activities=Activity.objects.filter(
        user=user,
        date=yesterday
    )


    today_consistency=calculate_consistency_score(user,today)
    today_completion=calculate_completion_score(today_activities)
    today_time_score=calculate_time_score(today_activities) 

    today_score = today_completion + today_time_score + today_consistency 

    yesterday_consistency=calculate_consistency_score(user,yesterday)
    yesterday_completion=calculate_completion_score(yesterday_activities)
    yesterday_time_score=calculate_time_score(yesterday_activities) 

    yesterday_score = yesterday_completion + yesterday_time_score + yesterday_consistency

    if yesterday_score==0:
        return None 

    
    return ((today_score - yesterday_score) / yesterday_score) * 100 

def calculate_weekly_scores(user):
    today_date = date.today()
    results = []

    for i in range(7):
        target_date = today_date - timedelta(days=i)

        activities = Activity.objects.filter(
            user=user,
            date=target_date
        )

        completion_score = calculate_completion_score(activities)
        time_score = calculate_time_score(activities)
        consistency_score = calculate_consistency_score(user, target_date)

        total_score = (
            completion_score
            + time_score
            + consistency_score
        )

        results.append({
            "date": target_date,
            "score": total_score
        })

    return results

def calculate_weekly_average(user):
    weekly_scores = calculate_weekly_scores(user)

    total_score = 0

    for day in weekly_scores:
        total_score += day["score"]

    weekly_average = total_score / 7

    return weekly_average 

def calculate_best_worst_day(user):
    weekly_scores = calculate_weekly_scores(user)

    best_day = max(weekly_scores, key=lambda x: x["score"])
    worst_day = min(weekly_scores, key=lambda x: x["score"])

    return {
        "best_day": best_day,
        "worst_day": worst_day
    } 

def calculate_current_streak(user):
    current_date = date.today()
    streak = 0

    while True:
        activities = Activity.objects.filter(
            user=user,
            date=current_date,
            completed=True
        )

        if not activities.exists():
            break

        streak += 1
        current_date -= timedelta(days=1)

    return streak

def calculate_category_stats(user):
    category_stats = (
        Activity.objects
        .filter(
            user=user,
            completed=True
        )
        .values("category")
        .annotate(total_duration=Sum("duration"))
        .order_by("-total_duration")
    )

    return list(category_stats)


def calculate_achievements(user):
    achievements = []

    # 1. 3 Day Streak
    current_streak = calculate_current_streak(user)

    achievements.append({
        "id": "three_day_streak",
        "title": "3 Day Streak",
        "description": "Maintain productivity for 3 consecutive days",
        "icon": "🔥",
        "unlocked": current_streak >= 3
    })

    # 2. 7 Day Streak
    achievements.append({
        "id": "seven_day_streak",
        "title": "7 Day Streak",
        "description": "Maintain productivity for 7 consecutive days",
        "icon": "🔥",
        "unlocked": current_streak >= 7
    })

    # 3. 10 Completed Activities
    completed_activities = Activity.objects.filter(
        user=user,
        completed=True
    ).count()

    achievements.append({
        "id": "ten_activities",
        "title": "10 Activities",
        "description": "Complete 10 activities",
        "icon": "⚡",
        "unlocked": completed_activities >= 10
    })

    # 4. 5 Hours Productive
    total_productive_time = (
        Activity.objects
        .filter(
            user=user,
            completed=True
        )
        .aggregate(total=Sum("duration"))["total"] or 0
    )

    achievements.append({
        "id": "five_hours",
        "title": "5 Hours Productive",
        "description": "Complete 5 hours of productive activities",
        "icon": "⏱️",
        "unlocked": total_productive_time >= 300
    })

    # 5. Perfect Day
    perfect_day = False

    completed_dates = (
        Activity.objects
        .filter(
            user=user,
            completed=True
        )
        .values_list("date", flat=True)
        .distinct()
    )

    for target_date in completed_dates:
        activities = Activity.objects.filter(
            user=user,
            date=target_date
        )

        total = activities.count()
        completed = activities.filter(completed=True).count()

        if total > 0 and total == completed:
            perfect_day = True
            break

    achievements.append({
        "id": "perfect_day",
        "title": "Perfect Day",
        "description": "Complete every activity in a day",
        "icon": "💯",
        "unlocked": perfect_day
    })

    return achievements 


def calculate_productivity_heatmap(user, days=365):
    today = date.today()
    results = []

    for i in range(days - 1, -1, -1):
        target_date = today - timedelta(days=i)

        activities = Activity.objects.filter(
            user=user,
            date=target_date
        )

        completion_score = calculate_completion_score(activities)
        time_score = calculate_time_score(activities)
        consistency_score = calculate_consistency_score(
            user,
            target_date
        )

        total_score = (
            completion_score
            + time_score
            + consistency_score
        )

        results.append({
            "date": target_date,
            "score": round(total_score, 2)
        })

    return results 



   



    



