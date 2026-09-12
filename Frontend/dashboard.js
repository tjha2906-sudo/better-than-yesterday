/* =========================================================
   BETTER THAN YESTERDAY
   DASHBOARD V4
========================================================= */


/* =========================================================
   CONFIG
========================================================= */

const API_BASE =
    window.BTY_CONFIG.API_BASE;

const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";
const USERNAME_KEY = "username";


/* =========================================================
   STATE
========================================================= */

const state = {

    currentSection: "overview",

    dashboard: null,

    comparison: null,

    activities: [],

    goals: null,

    achievements: [],

    focusSessions: [],

    heatmap: [],

    focus: {

        sessionId: null,

        duration: 25,

        remaining: 25 * 60,

        status: "ready",

        timer: null,

        activityId: null,

        startedAt: null,
        endAt: null

    }

};


/* =========================================================
   DOM
========================================================= */

const $ = (selector, parent = document) =>
    parent.querySelector(selector);

const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];


/* =========================================================
   HELPERS
========================================================= */

function clamp(value, min, max) {

    return Math.min(
        Math.max(value, min),
        max
    );
}


function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function roundNumber(value) {

    const number = Number(value || 0);

    return Number.isInteger(number)
        ? number
        : Number(number.toFixed(1));
}


function formatTime(seconds) {

    seconds = Math.max(
        0,
        Math.floor(seconds)
    );

    const minutes =
        Math.floor(seconds / 60);

    const remainingSeconds =
        seconds % 60;

    return `${String(minutes).padStart(2,"0")}:${String(remainingSeconds).padStart(2,"0")}`;
}


function formatPercentage(value) {

    const number = Number(value || 0);

    return `${roundNumber(number)}%`;
}


function formatSignedPercentage(value) {

    const number = Number(value || 0);

    if (number > 0) {
        return `+${roundNumber(number)}%`;
    }

    return `${roundNumber(number)}%`;
}


function calculatePercent(value, total) {

    if (!total) {
        return 0;
    }

    return clamp(
        (Number(value) / Number(total)) * 100,
        0,
        100
    );
}


function calculateChange(yesterday, today) {

    yesterday = Number(yesterday || 0);
    today = Number(today || 0);

    if (yesterday === 0) {

        if (today === 0) {
            return 0;
        }

        return 100;
    }

    return ((today - yesterday) / yesterday) * 100;
}


function formatDayResult(value) {

    if (!value) {
        return "—";
    }

    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "object") {

        return (
            value.date ||
            value.day ||
            value.label ||
            "—"
        );
    }

    return String(value);
}


/* =========================================================
   AUTH
========================================================= */

function getAccessToken() {

    return localStorage.getItem(
        ACCESS_KEY
    );
}


function getRefreshToken() {

    return localStorage.getItem(
        REFRESH_KEY
    );
}


/*
    IMPORTANT:
    New auth stores username here.
    Older sessions may have bty_user.
*/

function getUsername() {
    const direct = localStorage.getItem(USERNAME_KEY);

    if (direct && direct.trim()) {
        return direct.trim();
    }

    try {
        const oldUser = JSON.parse(
            localStorage.getItem("bty_user") || "null"
        );

        if (oldUser?.username) {
            const username = String(oldUser.username).trim();

            if (username) {
                localStorage.setItem(USERNAME_KEY, username);
                return username;
            }
        }
    } catch (error) {
        console.warn("Could not read bty_user.", error);
    }

    // Final fallback
    return "Tejas";
} 


function clearAuth() {

    localStorage.removeItem(
        ACCESS_KEY
    );

    localStorage.removeItem(
        REFRESH_KEY
    );

    localStorage.removeItem(
        USERNAME_KEY
    );

    localStorage.removeItem(
        "bty_user"
    );

    localStorage.removeItem(
        "bty_session"
    );
}


function logout() {

    stopClientTimer();

    clearAuth();

    window.location.href =
        "auth.html?mode=login";
}


/* =========================================================
   TOKEN REFRESH
========================================================= */

async function refreshAccessToken() {

    const refresh =
        getRefreshToken();

    if (!refresh) {
        return false;
    }


    try {

        const response =
            await fetch(
                `${API_BASE}/api/token/refresh/`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        refresh
                    })
                }
            );


        if (!response.ok) {
            return false;
        }


        const data =
            await response.json();


        if (!data.access) {
            return false;
        }


        localStorage.setItem(
            ACCESS_KEY,
            data.access
        );

        return true;

    } catch (error) {

        console.error(
            "Token refresh failed:",
            error
        );

        return false;
    }
}


/* =========================================================
   API
========================================================= */

async function apiFetch(
    endpoint,
    options = {},
    retry = true
) {

    const token =
        getAccessToken();


    if (!token) {

        logout();

        throw new Error(
            "Authentication required."
        );
    }


    const headers = {
        ...(options.headers || {}),

        "Authorization":
            `Bearer ${token}`,

        "Content-Type":
            "application/json"
    };


    let response;


    try {

        response =
            await fetch(
                `${API_BASE}${endpoint}`,
                {
                    ...options,
                    headers
                }
            );

    } catch (error) {

        showToast(
            "Cannot connect to the Django server.",
            "error"
        );

        throw error;
    }


    if (
        response.status === 401 &&
        retry
    ) {

        const refreshed =
            await refreshAccessToken();


        if (refreshed) {

            return apiFetch(
                endpoint,
                options,
                false
            );
        }


        logout();

        throw new Error(
            "Session expired."
        );
    }


    return response;
}


async function apiJSON(
    endpoint,
    options = {}
) {

    const response =
        await apiFetch(
            endpoint,
            options
        );


    let data = null;


    try {

        data =
            await response.json();

    } catch {

        data = null;
    }


    if (!response.ok) {

        let message =
            data?.detail ||
            data?.message ||
            "Something went wrong.";


        if (
            typeof data === "object" &&
            !data.detail &&
            !data.message
        ) {

            const firstError =
                Object.values(data)[0];

            if (Array.isArray(firstError)) {
                message = firstError[0];
            }
        }


        throw new Error(
            String(message)
        );
    }


    return data;
}


/* =========================================================
   USER / DATE
========================================================= */

function setupUser() {

    const username =
        getUsername();


    $("#heroUsername").textContent =
        username;

    $("#sidebarUsername").textContent =
        username;

    $("#userAvatar").textContent =
        username.charAt(0).toUpperCase() || "T";

    $("#mobileAvatar").textContent =
        username.charAt(0).toUpperCase() || "T";
}


function setupDate() {

    const date =
        new Date();


    $("#headerDate").textContent =
        date.toLocaleDateString(
            "en-IN",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );
}


/* =========================================================
   PARTICLES
========================================================= */

function createParticles() {

    const container =
        $("#particleLayer");

    if (!container) {
        return;
    }


    const count =
        window.innerWidth < 700
            ? 20
            : 45;


    for (
        let i = 0;
        i < count;
        i++
    ) {

        const particle =
            document.createElement("div");


        particle.className =
            "dash-particle";


        particle.style.left =
            `${Math.random() * 100}%`;


        particle.style.top =
            `${Math.random() * 100}%`;


        particle.style.setProperty(
            "--particle-x",
            `${(Math.random() - .5) * 100}px`
        );


        particle.style.setProperty(
            "--particle-y",
            `${(Math.random() - .5) * 100}px`
        );


        particle.style.setProperty(
            "--particle-duration",
            `${5 + Math.random() * 10}s`
        );


        particle.style.setProperty(
            "--particle-opacity",
            `${.15 + Math.random() * .35}`
        );


        container.appendChild(
            particle
        );
    }
}


/* =========================================================
   3D TRANSITION
========================================================= */

let transitionScene = null;
let transitionCamera = null;
let transitionRenderer = null;
let transitionGroup = null;
let transitionAnimationFrame = null;


function initTransitionScene() {

    const canvas =
        $("#transitionCanvas");


    if (
        !canvas ||
        typeof THREE === "undefined"
    ) {
        return;
    }


    transitionScene =
        new THREE.Scene();


    transitionCamera =
        new THREE.PerspectiveCamera(
            50,
            window.innerWidth /
                window.innerHeight,
            0.1,
            100
        );


    transitionCamera.position.z =
        5;


    transitionRenderer =
        new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true
        });


    transitionRenderer.setPixelRatio(
        Math.min(
            window.devicePixelRatio,
            2
        )
    );


    transitionRenderer.setSize(
        window.innerWidth,
        window.innerHeight
    );


    transitionGroup =
        new THREE.Group();


    transitionScene.add(
        transitionGroup
    );


    /* Main wire sphere */

    const geometry =
        new THREE.IcosahedronGeometry(
            1.25,
            2
        );


    const material =
        new THREE.MeshBasicMaterial({
            color: 0xee9a32,
            wireframe: true,
            transparent: true,
            opacity: .82
        });


    const orb =
        new THREE.Mesh(
            geometry,
            material
        );


    transitionGroup.add(
        orb
    );


    /* Inner sphere */

    const innerGeometry =
        new THREE.IcosahedronGeometry(
            .7,
            1
        );


    const innerMaterial =
        new THREE.MeshBasicMaterial({
            color: 0x4fd1b0,
            wireframe: true,
            transparent: true,
            opacity: .22
        });


    const inner =
        new THREE.Mesh(
            innerGeometry,
            innerMaterial
        );


    transitionGroup.add(
        inner
    );


    /* Orbit rings */

    for (
        let i = 0;
        i < 3;
        i++
    ) {

        const ringGeometry =
            new THREE.TorusGeometry(
                1.55 + i * .25,
                .008,
                8,
                100
            );


        const ringMaterial =
            new THREE.MeshBasicMaterial({
                color:
                    i === 1
                        ? 0x4fd1b0
                        : 0xee9a32,
                transparent: true,
                opacity: .28
            });


        const ring =
            new THREE.Mesh(
                ringGeometry,
                ringMaterial
            );


        ring.rotation.x =
            Math.PI *
            (.3 + i * .23);


        ring.rotation.y =
            Math.PI *
            (.2 + i * .17);


        transitionGroup.add(
            ring
        );
    }


    animateTransitionScene();


    window.addEventListener(
        "resize",
        resizeTransitionScene
    );
}


function animateTransitionScene() {

    if (
        !transitionRenderer ||
        !transitionScene ||
        !transitionCamera
    ) {
        return;
    }


    transitionAnimationFrame =
        requestAnimationFrame(
            animateTransitionScene
        );


    const time =
        performance.now() * .001;


    if (transitionGroup) {

        transitionGroup.rotation.x =
            time * .17;

        transitionGroup.rotation.y =
            time * .25;

        transitionGroup.rotation.z =
            Math.sin(time * .5) * .15;

        const scale =
            1 +
            Math.sin(time * 2) * .035;

        transitionGroup.scale.set(
            scale,
            scale,
            scale
        );
    }


    transitionRenderer.render(
        transitionScene,
        transitionCamera
    );
}


function resizeTransitionScene() {

    if (
        !transitionRenderer ||
        !transitionCamera
    ) {
        return;
    }


    transitionCamera.aspect =
        window.innerWidth /
        window.innerHeight;


    transitionCamera.updateProjectionMatrix();


    transitionRenderer.setSize(
        window.innerWidth,
        window.innerHeight
    );
}


function playTransition(label = "Loading") {

    const overlay =
        $("#transitionScene");


    if (!overlay) {
        return;
    }


    $("#transitionLabel").textContent =
        label;


    overlay.classList.remove(
        "is-active"
    );


    void overlay.offsetWidth;


    overlay.classList.add(
        "is-active"
    );


    setTimeout(() => {

        overlay.classList.remove(
            "is-active"
        );

    }, 900);
}


/* =========================================================
   SECTION NAVIGATION
========================================================= */

function navigateToSection(
    section,
    updateHash = true,
    useTransition = true
) {

    const target =
        document.querySelector(
            `[data-section-panel="${section}"]`
        );


    if (!target) {
        return;
    }


    if (
        state.currentSection === section &&
        target.classList.contains("is-active")
    ) {
        return;
    }


    if (useTransition) {

        const labels = {
            overview: "Overview",
            activities: "Activities",
            focus: "Deep work",
            goals: "Today's goals",
            progress: "Your progress",
            achievements: "Milestones",
            premium: "Premium Report"
        };


        playTransition(
            labels[section] ||
            "Loading"
        );
    }


    $$(".nav-item")
        .forEach(item => {

            item.classList.toggle(
                "is-active",
                item.dataset.section === section
            );

        });


    $$(".dashboard-section")
        .forEach(panel => {

            panel.classList.remove(
                "is-active"
            );

        });


    setTimeout(() => {

        target.classList.add(
            "is-active"
        );

        window.scrollTo({
            top: 0,
            behavior:
                window.matchMedia(
                    "(prefers-reduced-motion: reduce)"
                ).matches
                    ? "auto"
                    : "smooth"
        });

    }, useTransition ? 220 : 0);


    state.currentSection =
        section;


    if (updateHash) {

        history.replaceState(
            null,
            "",
            `#${section}`
        );
    }


    closeMobileSidebar();


    loadSectionData(
        section
    );
}


async function loadSectionData(
    section
) {

    try {

        if (
            section === "overview"
        ) {

            await Promise.all([
                loadDashboard(),
                loadGoals(),
                loadActivities(),
                loadComparison()
            ]);

        }

        else if (
            section === "activities"
        ) {

            await loadActivities();

        }

        else if (
            section === "focus"
        ) {

            await Promise.all([
                loadActivities(),
                loadFocusSessions()
            ]);

        }

        else if (
            section === "goals"
        ) {

            await loadGoals();

        }

        else if (
            section === "progress"
        ) {

            await Promise.all([
                loadDashboard(),
                loadComparison(),
                loadHeatmap()
            ]);

        }

        else if (
            section === "achievements"
        ) {

            await loadAchievements();

        }

    } catch (error) {

        console.error(
            `Failed to load ${section}:`,
            error
        );
    }
}


/* =========================================================
   DASHBOARD
========================================================= */

async function loadDashboard() {

    try {

        const data =
            await apiJSON(
                "/api/dashboard/"
            );


        state.dashboard =
            data;


        renderDashboard(
            data
        );

    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );

        showToast(
            "Could not load dashboard data.",
            "error"
        );
    }
}


function renderDashboard(data) {

    const totalScore =
        Number(
            data.total_score || 0
        );


    const completion =
        Number(
            data.completion_score || 0
        );


    const focus =
        Number(
            data.time_score || 0
        );


    const consistency =
        Number(
            data.consistency_score || 0
        );


    const improvement =
        Number(
            data.improvement || 0
        );


    const streak =
        Number(
            data.current_streak || 0
        );


    animateNumber(
        $("#totalScore"),
        totalScore
    );


    animateNumber(
        $("#completionScore"),
        completion
    );


    animateNumber(
        $("#focusScore"),
        focus
    );


    animateNumber(
        $("#consistencyScore"),
        consistency
    );


    $("#improvementScore").textContent =
        formatPercentage(
            improvement
        );


    updateScoreRing(
        totalScore
    );


    if (totalScore >= 80) {

        $("#scoreMessage").textContent =
            "You're on fire.";

        $("#scoreDescription").textContent =
            "Your consistency is showing. Keep the momentum.";

    }

    else if (totalScore >= 50) {

        $("#scoreMessage").textContent =
            "Good work. Keep going.";

        $("#scoreDescription").textContent =
            "You're building momentum. One more good action.";

    }

    else if (totalScore > 0) {

        $("#scoreMessage").textContent =
            "You're getting started.";

        $("#scoreDescription").textContent =
            "Every completed action moves today's score.";

    }

    else {

        $("#scoreMessage").textContent =
            "Let's make today count.";

        $("#scoreDescription").textContent =
            "Your score combines completion, focused time and consistency.";
    }


    animateNumber(
        $("#streakValue"),
        streak
    );


    $("#streakMessage").textContent =
        streak > 0
            ? `${streak} day${streak === 1 ? "" : "s"} in a row. Keep it alive.`
            : "Start your streak today.";


    renderWeeklyChart(
        data.weekly_scores || []
    );


    $("#weeklyAverage").textContent =
        roundNumber(
            data.weekly_average || 0
        );


    $("#bestDay").textContent =
        formatDayResult(
            data.best_day
        );


    $("#worstDay").textContent =
        formatDayResult(
            data.worst_day
        );


    renderCategories(
        data.category_stats || {}
    );
}


/* =========================================================
   SCORE RING
========================================================= */

function updateScoreRing(score) {

    const ring =
        $("#scoreRing");


    if (!ring) {
        return;
    }


    const circumference =
        2 *
        Math.PI *
        92;


    const progress =
        clamp(
            Number(score || 0) / 100,
            0,
            1
        );


    ring.style.strokeDasharray =
        circumference;


    ring.style.strokeDashoffset =
        circumference *
        (1 - progress);
}


/* =========================================================
   WEEKLY CHART
========================================================= */

function renderWeeklyChart(scores) {

    const container =
        $("#weeklyChart");


    if (!container) {
        return;
    }


    if (
        !Array.isArray(scores) ||
        scores.length === 0
    ) {

        container.innerHTML =
            `
            <div class="empty-state compact"
                 style="grid-column:1/-1">
                <p>
                    Complete activities to build your weekly chart.
                </p>
            </div>
            `;

        return;
    }


    const max =
        Math.max(
            ...scores.map(
                item =>
                    Number(
                        item.score ??
                        item.value ??
                        0
                    )
            ),
            1
        );


    container.innerHTML =
        scores
            .slice(-7)
            .map((item, index) => {

                const score =
                    Number(
                        item.score ??
                        item.value ??
                        0
                    );


                const label =
                    item.day ||
                    item.label ||
                    item.date ||
                    `D${index + 1}`;


                const height =
                    clamp(
                        (score / max) * 100,
                        3,
                        100
                    );


                return `
                    <div class="week-bar-wrap">

                        <span class="week-value">
                            ${roundNumber(score)}
                        </span>

                        <div
                            class="week-bar"
                            style="height:${height}%"
                            title="${escapeHTML(label)}: ${roundNumber(score)}"
                        ></div>

                        <span class="week-label">
                            ${escapeHTML(
                                String(label).slice(0,3)
                            )}
                        </span>

                    </div>
                `;

            })
            .join("");
}


/* =========================================================
   CATEGORIES
========================================================= */

function renderCategories(
    categories
) {

    const container =
        $("#categoryStats");


    if (!container) {
        return;
    }


    let entries = [];


    if (
        Array.isArray(categories)
    ) {

        entries =
            categories.map(item => [

                item.category ||
                item.name ||
                "Other",

                Number(
                    item.value ??
                    item.count ??
                    item.minutes ??
                    0
                )

            ]);

    }

    else if (
        categories &&
        typeof categories === "object"
    ) {

        entries =
            Object.entries(
                categories
            ).map(([name,value]) => [

                name,

                Number(
                    value?.count ??
                    value?.minutes ??
                    value?.value ??
                    value ??
                    0
                )

            ]);
    }


    if (!entries.length) {

        container.innerHTML =
            `
            <div class="empty-state compact"
                 style="grid-column:1/-1">
                <p>
                    Category data will appear as you log work.
                </p>
            </div>
            `;

        return;
    }


    const max =
        Math.max(
            ...entries.map(
                item => item[1]
            ),
            1
        );


    container.innerHTML =
        entries
            .map(([name,value]) => {

                const width =
                    clamp(
                        (value / max) * 100,
                        3,
                        100
                    );


                return `
                    <div class="category-item">

                        <div class="category-item-top">

                            <span>
                                ${escapeHTML(name)}
                            </span>

                            <strong>
                                ${roundNumber(value)}
                            </strong>

                        </div>

                        <div class="category-bar">

                            <div
                                style="width:${width}%"
                            ></div>

                        </div>

                    </div>
                `;

            })
            .join("");
}


/* =========================================================
   ACTIVITIES
========================================================= */

async function loadActivities() {

    try {

        const data =
            await apiJSON(
                "/api/activities/today/"
            );


        state.activities =
            Array.isArray(data)
                ? data
                : (
                    data?.results ||
                    data?.activities ||
                    []
                );


        renderActivities(
            state.activities
        );


        populateFocusActivities(
            state.activities
        );


        updateActivitySummary(
            state.activities
        );

    } catch (error) {

        console.error(
            "Activities error:",
            error
        );
    }
}


function renderActivities(
    activities
) {

    const container =
        $("#activitiesList");


    if (!container) {
        return;
    }


    if (!activities.length) {

        container.innerHTML =
            `
            <div class="empty-state">

                <span class="empty-icon">
                    ◇
                </span>

                <h3>
                    No activities yet
                </h3>

                <p>
                    Add your first productive activity.
                </p>

            </div>
            `;

        return;
    }


    container.innerHTML =
        activities
            .map(activity => {

                const id =
                    Number(activity.id);


                const completed =
                    Boolean(
                        activity.completed
                    );


                return `
                    <article
                        class="
                            activity-item
                            ${completed ? "is-completed" : ""}
                        "
                        data-activity-id="${id}"
                    >

                        <button
                            class="activity-check"
                            data-action="toggle-activity"
                            data-id="${id}"
                            title="${
                                completed
                                    ? "Mark incomplete"
                                    : "Mark complete"
                            }"
                        >
                            ${
                                completed
                                    ? "✓"
                                    : "○"
                            }
                        </button>


                        <div class="activity-main">

                            <span class="activity-title">
                                ${escapeHTML(
                                    activity.title
                                )}
                            </span>

                            <div class="activity-meta">

                                ${
                                    activity.category
                                        ? `
                                            <span>
                                                ${escapeHTML(
                                                    activity.category
                                                )}
                                            </span>
                                        `
                                        : ""
                                }

                                <span>
                                    ${escapeHTML(
                                        activity.date ||
                                        "Today"
                                    )}
                                </span>

                            </div>

                        </div>


                        <span class="activity-duration">
                            ${Number(
                                activity.duration || 0
                            )} min
                        </span>


                        <button
                            class="activity-delete"
                            data-action="delete-activity"
                            data-id="${id}"
                            title="Delete activity"
                        >
                            ×
                        </button>

                    </article>
                `;

            })
            .join("");
}


function updateActivitySummary(
    activities
) {

    const total =
        activities.length;


    const completed =
        activities.filter(
            activity =>
                Boolean(
                    activity.completed
                )
        ).length;


    const minutes =
        activities
            .filter(
                activity =>
                    Boolean(
                        activity.completed
                    )
            )
            .reduce(
                (sum, activity) =>
                    sum +
                    Number(
                        activity.duration || 0
                    ),
                0
            );


    $("#activityCount").textContent =
        total;


    $("#completedActivityCount").textContent =
        completed;


    $("#activityMinutes").textContent =
        `${minutes} min`;
}


async function createActivity(
    event
) {

    event.preventDefault();


    const title =
        $("#activityTitle")
            .value
            .trim();


    const category =
        $("#activityCategory")
            .value
            .trim();


    const duration =
        Number(
            $("#activityDuration")
                .value
        );


    if (
        !title ||
        !duration ||
        duration < 1
    ) {

        showToast(
            "Enter a title and valid duration.",
            "error"
        );

        return;
    }


    try {

        await apiJSON(
            "/api/activities/",
            {
                method: "POST",

                body: JSON.stringify({
                    title,
                    category,
                    duration,
                    completed: false
                })
            }
        );


        closeModal(
            "activityModal"
        );


        $("#activityForm")
            .reset();


        showToast(
            "Activity added.",
            "success"
        );


        await refreshCoreData();

    } catch (error) {

        showToast(
            error.message,
            "error"
        );
    }
}


async function toggleActivity(
    id
) {

    const activity =
        state.activities.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    if (!activity) {
        return;
    }


    try {

        await apiJSON(
            `/api/activities/${id}/`,
            {
                method: "PUT",

                body: JSON.stringify({
                    title:
                        activity.title,

                    category:
                        activity.category || "",

                    duration:
                        Number(
                            activity.duration || 0
                        ),

                    completed:
                        !activity.completed
                })
            }
        );


        showToast(
            activity.completed
                ? "Activity reopened."
                : "Activity completed.",
            "success"
        );


        await refreshCoreData();

    } catch (error) {

        showToast(
            error.message,
            "error"
        );
    }
}


async function deleteActivity(
    id
) {

    const confirmed =
        window.confirm(
            "Delete this activity?"
        );


    if (!confirmed) {
        return;
    }


    try {

        await apiJSON(
            `/api/activities/${id}/`,
            {
                method: "DELETE"
            }
        );


        showToast(
            "Activity deleted.",
            "success"
        );


        await refreshCoreData();

    } catch (error) {

        showToast(
            error.message,
            "error"
        );
    }
}


/* =========================================================
   GOALS
========================================================= */

async function loadGoals() {

    try {

        const data =
            await apiJSON(
                "/api/goals/today/"
            );


        state.goals =
            data;


        renderGoals(
            data
        );

    } catch (error) {

        console.error(
            "Goals error:",
            error
        );
    }
}


function renderGoals(data) {

    if (!data) {
        return;
    }


    const activityTarget =
        Number(
            data.activity_target || 5
        );


    const timeTarget =
        Number(
            data.time_target || 120
        );


    const completedActivities =
        Number(
            data.completed_activities || 0
        );


    const completedTime =
        Number(
            data.completed_time || 0
        );


    const activityProgress =
        Number(
            data.activity_progress ??
            calculatePercent(
                completedActivities,
                activityTarget
            )
        );


    const timeProgress =
        Number(
            data.time_progress ??
            calculatePercent(
                completedTime,
                timeTarget
            )
        );


    $("#goalActivityText").textContent =
        `${completedActivities} / ${activityTarget}`;


    $("#goalTimeText").textContent =
        `${completedTime} / ${timeTarget} min`;


    $("#goalActivityPercent").textContent =
        `${Math.round(activityProgress)}%`;


    $("#goalTimePercent").textContent =
        `${Math.round(timeProgress)}%`;


    $("#goalActivityBar").style.width =
        `${clamp(activityProgress,0,100)}%`;


    $("#goalTimeBar").style.width =
        `${clamp(timeProgress,0,100)}%`;


    if (
        activityProgress >= 100 &&
        timeProgress >= 100
    ) {

        $("#goalMessage").textContent =
            "You did what you said you'd do.";

    }

    else if (
        activityProgress >= 70 ||
        timeProgress >= 70
    ) {

        $("#goalMessage").textContent =
            "You're close. Finish strong.";

    }

    else {

        $("#goalMessage").textContent =
            "Your day is still yours.";
    }
}


function populateGoalForm() {

    $("#goalActivities").value =
        state.goals?.activity_target ||
        5;


    $("#goalTime").value =
        state.goals?.time_target ||
        120;
}


async function saveGoals(event) {

    event.preventDefault();


    const activityTarget =
        Number(
            $("#goalActivities").value
        );


    const timeTarget =
        Number(
            $("#goalTime").value
        );


    if (
        !activityTarget ||
        activityTarget < 1 ||
        !timeTarget ||
        timeTarget < 1
    ) {

        showToast(
            "Enter valid targets.",
            "error"
        );

        return;
    }


    try {

        const existingId =
            state.goals?.id;


        let data;


        if (existingId) {

            data =
                await apiJSON(
                    "/api/goals/today/",
                    {
                        method: "PUT",

                        body: JSON.stringify({
                            activity_target:
                                activityTarget,

                            time_target:
                                timeTarget
                        })
                    }
                );

        }

        else {

            data =
                await apiJSON(
                    "/api/goals/today/",
                    {
                        method: "POST",

                        body: JSON.stringify({
                            activity_target:
                                activityTarget,

                            time_target:
                                timeTarget
                        })
                    }
                );
        }


        state.goals =
            data;


        renderGoals(
            data
        );


        closeModal(
            "goalsModal"
        );


        showToast(
            "Daily targets updated.",
            "success"
        );

    } catch (error) {

        showToast(
            error.message,
            "error"
        );
    }
}


/* =========================================================
   COMPARISON
========================================================= */

async function loadComparison() {

    try {

        const data =
            await apiJSON(
                "/api/dashboard/comparison/"
            );


        state.comparison =
            data;


        renderComparison(
            data
        );

    } catch (error) {

        console.error(
            "Comparison error:",
            error
        );
    }
}


function renderComparison(data) {

    const yesterday =
        Number(
            data?.yesterday || 0
        );


    const today =
        Number(
            data?.today || 0
        );


    $("#yesterdayScore").textContent =
        roundNumber(yesterday);


    $("#todayComparisonScore").textContent =
        roundNumber(today);


    $("#comparisonChange").textContent =
        formatSignedPercentage(
            calculateChange(
                yesterday,
                today
            )
        );
}


/* =========================================================
   FOCUS DURATION
========================================================= */

function getSelectedFocusDuration() {

    const custom =
        $("#customDuration")?.value;


    if (
        custom !== undefined &&
        custom !== null &&
        String(custom).trim() !== ""
    ) {

        const value =
            Number(custom);


        if (
            !Number.isFinite(value) ||
            value < 1 ||
            value > 180
        ) {

            throw new Error(
                "Custom duration must be between 1 and 180 minutes."
            );
        }


        return Math.round(value);
    }


    return clamp(
        Number(
            state.focus.duration
        ),
        1,
        180
    );
}


function setFocusDuration(
    minutes,
    clearCustom = true
) {

    minutes =
        clamp(
            Number(minutes) || 25,
            1,
            180
        );


    if (
        state.focus.status === "running" ||
        state.focus.status === "paused"
    ) {

        showToast(
            "Finish or cancel the current session first.",
            "error"
        );

        return;
    }


    state.focus.duration =
        minutes;


    state.focus.remaining =
        minutes * 60;

    state.focus.endAt = null;


    $("#focusTime").textContent =
        formatTime(
            state.focus.remaining
        );


    $$(".duration-btn")
        .forEach(btn => {

            btn.classList.toggle(
                "is-selected",
                Number(
                    btn.dataset.duration
                ) === minutes
            );

        });


    if (clearCustom) {

        const custom =
            $("#customDuration");

        if (custom) {
            custom.value = "";
        }
    }


    updateTimerProgress();


    renderFocusState();
}


function applyCustomDuration() {

    const input =
        $("#customDuration");


    const value =
        Number(
            input.value
        );


    if (
        !Number.isFinite(value) ||
        value < 5 ||
        value > 180
    ) {

        showToast(
            "Choose a custom duration from 1 to 180 minutes.",
            "error"
        );

        return;
    }


    setFocusDuration(
        Math.round(value),
        false
    );


    $$(".duration-btn")
        .forEach(btn => {

            btn.classList.remove(
                "is-selected"
            );

        });


    showToast(
        `Custom timer set to ${Math.round(value)} minutes.`,
        "success"
    );
}


/* =========================================================
   FOCUS ACTIVITIES
========================================================= */

function populateFocusActivities(
    activities
) {

    const select =
        $("#focusActivity");


    if (!select) {
        return;
    }


    const current =
        select.value;


    select.innerHTML =
        `
        <option value="">
            Standalone focus
        </option>
        `;


    activities
        .filter(
            activity =>
                !activity.completed
        )
        .forEach(activity => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                activity.id;


            option.textContent =
                activity.title;


            select.appendChild(
                option
            );
        });


    if (
        current &&
        [...select.options]
            .some(
                option =>
                    option.value === current
            )
    ) {

        select.value =
            current;
    }
}


/* =========================================================
   FOCUS START
========================================================= */

async function startFocus() {

    if (
        state.focus.status === "running" ||
        state.focus.status === "paused"
    ) {

        return;
    }


    let duration;


    try {

        duration =
            getSelectedFocusDuration();

    } catch (error) {

        showToast(
            error.message,
            "error"
        );

        return;
    }


    const activityValue =
        $("#focusActivity").value;


    const activityId =
        activityValue
            ? Number(activityValue)
            : null;


    try {

        const data =
            await apiJSON(
                "/api/focus/start/",
                {
                    method: "POST",

                    body: JSON.stringify({
                        duration,
                        activity_id:
                            activityId
                    })
                }
            );


        state.focus.sessionId =
            data.id;


        state.focus.duration =
            Number(
                data.duration ||
                duration
            );


        state.focus.remaining =
            state.focus.duration *
            60;


        state.focus.status =
            "running";


        state.focus.activityId =
            activityId;


        state.focus.startedAt =
            data.started_at ||
            new Date().toISOString();

        state.focus.endAt =
            Date.now() + state.focus.remaining * 1000;


        startClientTimer();


        renderFocusState();


        showToast(
            `Focus started for ${state.focus.duration} minutes.`,
            "success"
        );


        await loadFocusSessions();

    } catch (error) {

        showToast(
            error.message,
            "error"
        );
    }
}


/* =========================================================
   CLIENT TIMER
========================================================= */

function startClientTimer() {

    stopClientTimer();

    if (!state.focus.endAt) {
        state.focus.endAt =
            Date.now() + state.focus.remaining * 1000;
    }

    const tick = () => {

        if (state.focus.status !== "running") {
            return;
        }

        const secondsLeft = Math.max(
            0,
            Math.ceil(
                (state.focus.endAt - Date.now()) / 1000
            )
        );

        state.focus.remaining = secondsLeft;

        renderFocusState();

        if (secondsLeft <= 0) {
            stopClientTimer();
            completeFocus(true);
        }
    };

    tick();

    state.focus.timer =
        setInterval(tick, 250);
}


function stopClientTimer() {

    if (
        state.focus.timer
    ) {

        clearInterval(
            state.focus.timer
        );

        state.focus.timer =
            null;
    }
}


/* =========================================================
   FOCUS PAUSE
========================================================= */

async function pauseFocus() {

    if (
        !state.focus.sessionId ||
        state.focus.status !==
            "running"
    ) {

        return;
    }


    try {

        await apiJSON(
            `/api/focus/${state.focus.sessionId}/pause/`,
            {
                method: "POST"
            }
        );


        state.focus.status =
            "paused";

        if (state.focus.endAt) {
            state.focus.remaining = Math.max(
                0,
                Math.ceil(
                    (state.focus.endAt - Date.now()) / 1000
                )
            );
        }

        state.focus.endAt = null;

        stopClientTimer();


        renderFocusState();


        showToast(
            "Focus paused.",
            "success"
        );

    } catch (error) {

        showToast(
            error.message,
            "error"
        );
    }
}


/* =========================================================
   FOCUS RESUME
========================================================= */

async function resumeFocus() {

    if (
        !state.focus.sessionId ||
        state.focus.status !==
            "paused"
    ) {

        return;
    }


    try {

        await apiJSON(
            `/api/focus/${state.focus.sessionId}/resume/`,
            {
                method: "POST"
            }
        );


        state.focus.status =
            "running";

        state.focus.endAt =
            Date.now() + state.focus.remaining * 1000;


        startClientTimer();


        renderFocusState();


        showToast(
            "Focus resumed.",
            "success"
        );

    } catch (error) {

        showToast(
            error.message,
            "error"
        );
    }
}


/* =========================================================
   FOCUS COMPLETE
========================================================= */

async function completeFocus(
    automatic = false
) {

    if (
        !state.focus.sessionId
    ) {

        return;
    }


    const sessionId =
        state.focus.sessionId;


    try {

        await apiJSON(
            `/api/focus/${sessionId}/complete/`,
            {
                method: "POST"
            }
        );


        stopClientTimer();


        state.focus.status =
            "completed";


        state.focus.remaining =
            0;

        state.focus.endAt = null;


        renderFocusState();


        showToast(
            automatic
                ? "Focus session completed. Great work."
                : "Focus session completed.",
            "success"
        );


        await refreshCoreData();

    } catch (error) {

        showToast(
            error.message,
            "error"
        );
    }
}


/* =========================================================
   FOCUS CANCEL
========================================================= */

async function cancelFocus() {

    if (
        !state.focus.sessionId
    ) {

        return;
    }


    const confirmed =
        window.confirm(
            "Cancel this focus session?"
        );


    if (!confirmed) {
        return;
    }


    try {

        await apiJSON(
            `/api/focus/${state.focus.sessionId}/cancel/`,
            {
                method: "POST"
            }
        );


        stopClientTimer();


        state.focus.status =
            "cancelled";

        state.focus.endAt = null;


        renderFocusState();


        showToast(
            "Focus session cancelled.",
            "success"
        );


        await loadFocusSessions();

    } catch (error) {

        showToast(
            error.message,
            "error"
        );
    }
}


/* =========================================================
   FOCUS RENDER
========================================================= */

function updateTimerProgress() {

    const progress =
        $("#timerProgress");


    if (!progress) {
        return;
    }


    const circumference =
        2 *
        Math.PI *
        130;


    const totalSeconds =
        Math.max(
            1,
            state.focus.duration *
            60
        );


    const remaining =
        clamp(
            state.focus.remaining,
            0,
            totalSeconds
        );


    const elapsed =
        totalSeconds -
        remaining;


    const ratio =
        elapsed /
        totalSeconds;


    progress.style.strokeDasharray =
        circumference;


    progress.style.strokeDashoffset =
        circumference *
        (1 - ratio);
}


function renderFocusState() {

    $("#focusTime").textContent =
        formatTime(
            state.focus.remaining
        );


    updateTimerProgress();

    const durationLabel =
        $("#focusDurationLabel");

    if (durationLabel) {
        durationLabel.textContent =
            `${state.focus.duration} min session`;
    }


    const status =
        $("#focusStatus");


    if (status) {

        status.className =
            "focus-status";


        if (
            state.focus.status ===
            "running"
        ) {

            status.classList.add(
                "running"
            );

            status.textContent =
                "Running";

        }

        else if (
            state.focus.status ===
            "paused"
        ) {

            status.classList.add(
                "paused"
            );

            status.textContent =
                "Paused";

        }

        else if (
            state.focus.status ===
            "completed"
        ) {

            status.classList.add(
                "completed"
            );

            status.textContent =
                "Completed";

        }

        else if (
            state.focus.status ===
            "cancelled"
        ) {

            status.textContent =
                "Cancelled";

        }

        else {

            status.textContent =
                "Ready";
        }
    }


    const startButton =
        $("#startFocusButton");


    const controls =
        $("#activeFocusControls");


    const pauseButton =
        $("#pauseFocusButton");


    const resumeButton =
        $("#resumeFocusButton");


    if (
        state.focus.status ===
            "running" ||
        state.focus.status ===
            "paused"
    ) {

        if (startButton) {
            startButton.style.display =
                "none";
        }

        if (controls) {
            controls.style.display =
                "flex";
        }

        if (pauseButton) {

            pauseButton.style.display =
                state.focus.status ===
                "running"
                    ? "inline-flex"
                    : "none";
        }

        if (resumeButton) {

            resumeButton.style.display =
                state.focus.status ===
                "paused"
                    ? "inline-flex"
                    : "none";
        }

    }

    else {

        if (startButton) {

            startButton.style.display =
                "inline-flex";

            startButton.textContent =
                state.focus.status ===
                    "completed"
                    ? "Start another"
                    : "Start focus";
        }

        if (controls) {
            controls.style.display =
                "none";
        }
    }
}


/* =========================================================
   FOCUS HISTORY
========================================================= */

async function loadFocusSessions() {

    try {

        const data =
            await apiJSON(
                "/api/focus/"
            );


        state.focusSessions =
            Array.isArray(data)
                ? data
                : (
                    data?.results ||
                    data?.sessions ||
                    []
                );


        renderFocusSessions(
            state.focusSessions
        );

    } catch (error) {

        console.error(
            "Focus history error:",
            error
        );
    }
}


function renderFocusSessions(
    sessions
) {

    const container =
        $("#focusSessionsList");


    if (!container) {
        return;
    }


    const completed =
        sessions.filter(
            session =>
                session.status ===
                "completed"
        );


    $("#focusSessionCount").textContent =
        completed.length;


    if (!sessions.length) {

        container.innerHTML =
            `
            <div class="empty-state compact">

                <p>
                    No focus sessions recorded yet.
                </p>

            </div>
            `;

        return;
    }


    container.innerHTML =
        sessions
            .slice(0,8)
            .map(session => {

                const duration =
                    Number(
                        session.duration || 0
                    );


                const status =
                    session.status ||
                    "unknown";


                let date =
                    session.started_at
                        ? new Date(
                            session.started_at
                        ).toLocaleDateString(
                            "en-IN",
                            {
                                day: "numeric",
                                month: "short"
                            }
                        )
                        : "Today";


                return `
                    <div class="focus-session-row">

                        <div>

                            <strong>
                                ${
                                    session.activity
                                        ? "Activity focus"
                                        : "Standalone focus"
                                }
                            </strong>

                            <span>
                                ${date}
                            </span>

                        </div>


                        <span>
                            ${duration} min
                        </span>


                        <span>
                            ${escapeHTML(status)}
                        </span>

                    </div>
                `;

            })
            .join("");
}


/* =========================================================
   HEATMAP
========================================================= */

async function loadHeatmap() {

    try {

        const data =
            await apiJSON(
                "/api/productivity-heatmap/"
            );


        state.heatmap =
            data?.days ||
            [];


        renderHeatmap(
            state.heatmap
        );

    } catch (error) {

        console.error(
            "Heatmap error:",
            error
        );
    }
}


function renderHeatmap(
    days
) {

    const container =
        $("#productivityHeatmap");


    if (!container) {
        return;
    }


    let values = [];


    if (Array.isArray(days)) {

        values =
            days.map(item => {

                if (
                    typeof item ===
                    "number"
                ) {

                    return {
                        value: item
                    };
                }


                return {
                    value:
                        Number(
                            item.value ??
                            item.score ??
                            item.count ??
                            item.minutes ??
                            0
                        ),

                    date:
                        item.date
                };
            });

    }

    else if (
        days &&
        typeof days === "object"
    ) {

        values =
            Object.entries(
                days
            ).map(
                ([date,value]) => ({
                    date,
                    value:
                        Number(
                            value?.value ??
                            value?.score ??
                            value?.count ??
                            value?.minutes ??
                            value ??
                            0
                        )
                })
            );
    }


    if (!values.length) {

        container.innerHTML =
            Array.from(
                { length: 126 },
                () =>
                    `
                    <div class="heat-cell"></div>
                    `
            ).join("");

        return;
    }


    const max =
        Math.max(
            ...values.map(
                item => item.value
            ),
            1
        );


    container.innerHTML =
        values
            .slice(-126)
            .map(item => {

                const ratio =
                    item.value /
                    max;


                let level = 0;


                if (ratio > 0) {
                    level = 1;
                }

                if (ratio > .25) {
                    level = 2;
                }

                if (ratio > .5) {
                    level = 3;
                }

                if (ratio > .75) {
                    level = 4;
                }


                return `
                    <div
                        class="heat-cell level-${level}"
                        title="${
                            item.date
                                ? `${escapeHTML(item.date)}: ${roundNumber(item.value)}`
                                : roundNumber(item.value)
                        }"
                    ></div>
                `;

            })
            .join("");
}


/* =========================================================
   ACHIEVEMENTS
========================================================= */

async function loadAchievements() {

    try {

        const data =
            await apiJSON(
                "/api/achievements/"
            );


        state.achievements =
            Array.isArray(data)
                ? data
                : (
                    data?.achievements ||
                    data?.results ||
                    []
                );


        renderAchievements(
            state.achievements
        );

    } catch (error) {

        console.error(
            "Achievements error:",
            error
        );
    }
}


function isAchievementUnlocked(
    achievement
) {

    if (
        achievement === true
    ) {

        return true;
    }


    if (
        typeof achievement ===
        "object" &&
        achievement !== null
    ) {

        return Boolean(
            achievement.unlocked ??
            achievement.completed ??
            achievement.earned ??
            achievement.is_unlocked ??
            false
        );
    }


    return false;
}


function getAchievementName(
    achievement,
    index
) {

    if (
        typeof achievement ===
        "string"
    ) {

        return achievement;
    }


    return (
        achievement?.name ||
        achievement?.title ||
        achievement?.achievement ||
        `Milestone ${index + 1}`
    );
}


function getAchievementDescription(
    name
) {

    const normalized =
        String(name)
            .toLowerCase();


    if (
        normalized.includes(
            "3 day"
        )
    ) {

        return "Maintain a productive streak for three days.";
    }


    if (
        normalized.includes(
            "7 day"
        )
    ) {

        return "Build a full week of consistent effort.";
    }


    if (
        normalized.includes(
            "10 activ"
        )
    ) {

        return "Complete ten productive activities.";
    }


    if (
        normalized.includes(
            "5 hour"
        )
    ) {

        return "Accumulate five hours of productive work.";
    }


    if (
        normalized.includes(
            "perfect"
        )
    ) {

        return "Complete every part of a productive day.";
    }


    return "A milestone in your Better Than Yesterday journey.";
}


function renderAchievements(
    achievements
) {

    const container =
        $("#achievementsGrid");


    if (!container) {
        return;
    }


    if (!achievements.length) {

        container.innerHTML =
            `
            <div
                class="empty-state"
                style="grid-column:1/-1"
            >
                <span class="empty-icon">
                    ◇
                </span>

                <h3>
                    Your milestones are waiting.
                </h3>

                <p>
                    Keep working. Your progress will unlock them.
                </p>

            </div>
            `;

        return;
    }


    container.innerHTML =
        achievements
            .map(
                (achievement,index) => {

                    const unlocked =
                        isAchievementUnlocked(
                            achievement
                        );


                    const name =
                        getAchievementName(
                            achievement,
                            index
                        );


                    const description =
                        achievement?.description ||
                        achievement?.message ||
                        getAchievementDescription(
                            name
                        );


                    return `
                        <article
                            class="
                                achievement-card
                                ${unlocked ? "is-unlocked" : ""}
                            "
                        >

                            <div class="achievement-icon">
                                ${
                                    unlocked
                                        ? "◆"
                                        : "◇"
                                }
                            </div>

                            <div class="achievement-status">
                                ${
                                    unlocked
                                        ? "Unlocked"
                                        : "Locked"
                                }
                            </div>

                            <h3>
                                ${escapeHTML(name)}
                            </h3>

                            <p>
                                ${escapeHTML(description)}
                            </p>

                        </article>
                    `;
                }
            )
            .join("");
}


/* =========================================================
   CORE REFRESH
========================================================= */

async function refreshCoreData() {

    await Promise.all([
        loadDashboard(),
        loadActivities(),
        loadGoals(),
        loadComparison(),
        loadAchievements()
    ]);


    if (
        state.currentSection ===
        "progress"
    ) {

        await loadHeatmap();
    }


    if (
        state.currentSection ===
        "focus"
    ) {

        await loadFocusSessions();
    }
}


/* =========================================================
   MODALS
========================================================= */

function openModal(id) {

    const modal =
        document.getElementById(id);


    if (!modal) {
        return;
    }


    modal.classList.add(
        "is-open"
    );


    setTimeout(() => {

        const firstInput =
            modal.querySelector(
                "input"
            );


        firstInput?.focus();

    }, 100);
}


function closeModal(id) {

    const modal =
        document.getElementById(id);


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "is-open"
    );
}


/* =========================================================
   MOBILE SIDEBAR
========================================================= */

function openMobileSidebar() {

    $("#sidebar")
        ?.classList.add(
            "is-open"
        );


    $("#sidebarOverlay")
        ?.classList.add(
            "is-open"
        );
}


function closeMobileSidebar() {

    $("#sidebar")
        ?.classList.remove(
            "is-open"
        );


    $("#sidebarOverlay")
        ?.classList.remove(
            "is-open"
        );
}


/* =========================================================
   TOAST
========================================================= */

function showToast(
    message,
    type = "success"
) {

    const container =
        $("#toastContainer");


    if (!container) {
        return;
    }


    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        `toast ${type}`;


    toast.textContent =
        message;


    container.appendChild(
        toast
    );


    setTimeout(
        () => {

            toast.style.opacity =
                "0";

            toast.style.transform =
                "translateY(10px)";

            setTimeout(
                () =>
                    toast.remove(),
                250
            );

        },
        3200
    );
}


/* =========================================================
   NUMBER ANIMATION
========================================================= */

function animateNumber(
    element,
    target
) {

    if (!element) {
        return;
    }


    const finalValue =
        Number(target || 0);


    const startValue =
        Number(
            element.dataset.numberValue ||
            0
        );


    const duration =
        550;


    const startTime =
        performance.now();


    function frame(now) {

        const progress =
            clamp(
                (now - startTime) /
                duration,
                0,
                1
            );


        const eased =
            1 -
            Math.pow(
                1 - progress,
                3
            );


        const value =
            startValue +
            (
                finalValue -
                startValue
            ) *
            eased;


        element.textContent =
            roundNumber(value);


        if (progress < 1) {

            requestAnimationFrame(
                frame
            );

        } else {

            element.dataset.numberValue =
                finalValue;
        }
    }


    requestAnimationFrame(
        frame
    );
}


/* =========================================================
   3D BUTTON INTERACTION
========================================================= */

function setupButton3DInteraction() {

    document.addEventListener("click", event => {

        const button = event.target.closest(
            "button, .quick-action, .nav-item"
        );

        if (!button) {
            return;
        }

        const pulse = document.createElement("span");
        pulse.className = "dash-click-pulse";

        const rect = button.getBoundingClientRect();

        pulse.style.left =
            `${event.clientX || rect.left + rect.width / 2}px`;

        pulse.style.top =
            `${event.clientY || rect.top + rect.height / 2}px`;

        document.body.appendChild(pulse);

        pulse.addEventListener(
            "animationend",
            () => pulse.remove(),
            { once: true }
        );
    });

}


/* =========================================================
   EVENT LISTENERS
========================================================= */

function setupNavigation() {

    $$(".nav-item")
        .forEach(item => {

            item.addEventListener(
                "click",
                () => {

                    navigateToSection(
                        item.dataset.section
                    );

                }
            );

        });


    $$("[data-go-section]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    navigateToSection(
                        button.dataset.goSection
                    );

                }
            );

        });
}


function setupActivityEvents() {

    $("#addActivityButton")
        ?.addEventListener(
            "click",
            () =>
                openModal(
                    "activityModal"
                )
        );


    $("#activityForm")
        ?.addEventListener(
            "submit",
            createActivity
        );


    $("#activitiesList")
        ?.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        "[data-action]"
                    );


                if (!button) {
                    return;
                }


                const action =
                    button.dataset.action;


                const id =
                    Number(
                        button.dataset.id
                    );


                if (
                    action ===
                    "toggle-activity"
                ) {

                    toggleActivity(
                        id
                    );
                }


                if (
                    action ===
                    "delete-activity"
                ) {

                    deleteActivity(
                        id
                    );
                }

            }
        );
}


function setupGoalEvents() {

    $("#editGoalsButton")
        ?.addEventListener(
            "click",
            () => {

                populateGoalForm();

                openModal(
                    "goalsModal"
                );

            }
        );


    $("#goalsForm")
        ?.addEventListener(
            "submit",
            saveGoals
        );
}


function setupFocusEvents() {

    $$(".duration-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    setFocusDuration(
                        Number(
                            button.dataset.duration
                        )
                    );

                }
            );

        });


    $("#setCustomDuration")
        ?.addEventListener(
            "click",
            applyCustomDuration
        );


    $("#customDuration")
        ?.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();

                    applyCustomDuration();
                }
            }
        );


    $("#startFocusButton")
        ?.addEventListener(
            "click",
            startFocus
        );


    $("#pauseFocusButton")
        ?.addEventListener(
            "click",
            pauseFocus
        );


    $("#resumeFocusButton")
        ?.addEventListener(
            "click",
            resumeFocus
        );


    $("#completeFocusButton")
        ?.addEventListener(
            "click",
            () =>
                completeFocus(false)
        );


    $("#cancelFocusButton")
        ?.addEventListener(
            "click",
            cancelFocus
        );
}


function setupModalEvents() {

    $$("[data-close-modal]")
        .forEach(element => {

            element.addEventListener(
                "click",
                () => {

                    const modal =
                        element.closest(
                            ".modal"
                        );


                    if (modal) {

                        modal.classList.remove(
                            "is-open"
                        );
                    }

                }
            );

        });


    $$(".modal")
        .forEach(modal => {

            modal.addEventListener(
                "click",
                event => {

                    if (
                        event.target ===
                        modal
                    ) {

                        modal.classList.remove(
                            "is-open"
                        );
                    }
                }
            );

        });


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                $$(".modal.is-open")
                    .forEach(
                        modal =>
                            modal.classList.remove(
                                "is-open"
                            )
                    );

                closeMobileSidebar();
            }

        }
    );
}


function setupMobileEvents() {

    $("#mobileMenuButton")
        ?.addEventListener(
            "click",
            openMobileSidebar
        );


    $("#sidebarOverlay")
        ?.addEventListener(
            "click",
            closeMobileSidebar
        );
}


function setupLogout() {

    $("#logoutButton")
        ?.addEventListener(
            "click",
            () => {

                const confirmed =
                    window.confirm(
                        "Log out of Better Than Yesterday?"
                    );


                if (confirmed) {
                    logout();
                }
            }
        );
}


/* =========================================================
   INITIALIZATION
========================================================= */

async function initDashboard() {

    /*
        Do not render dashboard without JWT.
    */

    if (!getAccessToken()) {

        window.location.href =
            "auth.html?mode=login";

        return;
    }


    setupUser();

    setupDate();

    createParticles();

    initTransitionScene();

    setupNavigation();
    setupButton3DInteraction();

    setupActivityEvents();

    setupGoalEvents();

    setupFocusEvents();

    setupModalEvents();

    setupMobileEvents();

    setupLogout();


    /*
        Initial timer.
    */

    setFocusDuration(
        25,
        true
    );


    /*
        Hash navigation.
    */

    const hash =
        window.location.hash
            .replace("#","")
            .trim();


    const validSections = [
        "overview",
        "activities",
        "focus",
        "goals",
        "progress",
        "achievements",
        "premium"
    ];


    if (
        validSections.includes(
            hash
        )
    ) {

        state.currentSection =
            "";


        navigateToSection(
            hash,
            false,
            false
        );

    }


    /*
        Initial data.
    */

    await loadSectionData(
        state.currentSection
    );


    /*
        Keep dashboard reasonably fresh.
    */

    setInterval(
        () => {

            if (
                document.visibilityState ===
                "visible"
            ) {

                refreshCoreData()
                    .catch(
                        console.error
                    );
            }

        },
        60000
    );
}


/* =========================================================
   PREMIUM REPORT + REAL x402 / PERA WALLET
========================================================= */

const PREMIUM_X402_URL =
    `${window.BTY_CONFIG.X402_BASE}/api/premium/productivity-report`;

const ALGORAND_TESTNET_CAIP2 =
    "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=";

let premiumPeraWallet = null;
let premiumWalletAddress = null;
let premiumPaymentBusy = false;


/* ---------------------------------------------------------
   Load browser packages dynamically.

   This keeps dashboard.js compatible with the existing
   Live Server setup. No bare "import ..." statements are
   added to this file.
--------------------------------------------------------- */

async function loadPremiumLibraries() {
    const [
        peraModule,
        x402CoreModule,
        x402AvmModule,
        x402FetchModule,
        algosdkModule
    ] = await Promise.all([
        import(
            "https://esm.sh/@perawallet/connect@1.6.0"
        ),
        import(
            "https://esm.sh/@x402/core@2.25.0/client"
        ),
        import(
            "https://esm.sh/@x402/avm@2.25.0"
        ),
        import(
            "https://esm.sh/@x402/fetch@2.25.0"
        ),
        import(
            "https://esm.sh/algosdk@3.5.2"
        )
    ]);

    const algosdk =
        algosdkModule.default || algosdkModule;

    console.log("\u2705 Premium libraries loaded");

    return {
        PeraWalletConnect:
            peraModule.PeraWalletConnect,

        x402Client:
            x402CoreModule.x402Client,

        ExactAvmScheme:
            x402AvmModule.ExactAvmScheme,

        wrapFetchWithPayment:
            x402FetchModule.wrapFetchWithPayment,

        algosdk
    };
}


/* ---------------------------------------------------------
   JWT
--------------------------------------------------------- */

function getPremiumAccessToken() {
    const keys = [
        "access_token",
        "accessToken",
        "token",
        "jwt"
    ];

    for (const key of keys) {
        const value =
            localStorage.getItem(key);

        if (value) {
            return value;
        }
    }

    return null;
}

function isTokenExpired(token) {
    try {
        const payload = JSON.parse(
            atob(
                token.split(".")[1]
                    .replace(/-/g, "+")
                    .replace(/_/g, "/")
            )
        );

        if (!payload.exp) {
            return false;
        }

        // 30-second safety buffer
        return payload.exp * 1000 <= Date.now() + 30000;

    } catch (error) {
        console.warn(
            "Could not decode access token:",
            error
        );

        return true;
    }
}


async function getFreshPremiumAccessToken() {

    let token =
        getPremiumAccessToken();

    if (!token) {
        return null;
    }

    // Token still valid
    if (!isTokenExpired(token)) {
        return token;
    }

    console.log(
        "🔄 Premium access token expired. Refreshing..."
    );

    const refreshed =
        await refreshAccessToken();

    if (!refreshed) {
        console.error(
            "❌ Could not refresh premium access token."
        );

        return null;
    }

    token =
        getAccessToken();

    console.log(
        "✅ Premium access token refreshed."
    );

    return token;
} 


/* ---------------------------------------------------------
   Premium UI helpers
--------------------------------------------------------- */

function setPremiumMessage(message) {
    const elements = [
        document.getElementById("premiumStatus"),
        document.getElementById("premiumLoading")
    ];

    elements.forEach(element => {
        if (element) {
            element.textContent = message;
        }
    });
}


function setPremiumButtonsBusy(busy) {
    const buttons = [
        document.getElementById("unlockPremiumBtn"),
        document.getElementById("unlockPremiumButton")
    ];

    buttons.forEach(button => {
        if (!button) {
            return;
        }

        button.disabled =
            busy || (
                button.id === "unlockPremiumButton" &&
                !premiumWalletAddress
            );

        if (busy) {
            button.dataset.originalText =
                button.textContent;

            button.textContent =
                "Processing...";
        } else if (button.dataset.originalText) {
            button.textContent =
                button.dataset.originalText;

            delete button.dataset.originalText;
        }
    });
}


function escapePremiumHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* ---------------------------------------------------------
   Render premium report
--------------------------------------------------------- */

function renderPremiumReport(data) {
    const report =
        data?.report;

    if (!report) {
        throw new Error(
            "Premium report data was not returned."
        );
    }

    const premiumReport =
        document.getElementById(
            "premiumReport"
        );

    if (premiumReport) {
        premiumReport.style.display =
            "block";

        // Put the newly unlocked report in the user's viewport.
        requestAnimationFrame(() => {
            premiumReport.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });
    }

    const title =
        document.getElementById(
            "premiumReportTitle"
        );

    if (title) {
        title.textContent =
            report.title ||
            "Premium Productivity Insight";
    }

    const summary =
        document.getElementById(
            "premiumSummary"
        );

    if (summary) {
        summary.textContent =
            report.summary || "";
    }

    const metrics =
        document.getElementById(
            "premiumMetrics"
        );

    if (metrics) {
        const m =
            report.metrics || {};

        metrics.innerHTML = `
            <div class="premium-metric">
                <span>Productivity Score</span>
                <strong>
                    ${Number(m.totalScore || 0).toFixed(1)}
                    <small>/100</small>
                </strong>
            </div>

            <div class="premium-metric">
                <span>Improvement</span>
                <strong>
                    ${Number(m.improvement || 0).toFixed(1)}%
                </strong>
            </div>

            <div class="premium-metric">
                <span>Current Streak</span>
                <strong>
                    ${Number(m.currentStreak || 0)}
                    <small>days</small>
                </strong>
            </div>

            <div class="premium-metric">
                <span>Weekly Average</span>
                <strong>
                    ${Number(m.weeklyAverage || 0).toFixed(1)}
                </strong>
            </div>
        `;
    }

    const insights =
        document.getElementById(
            "premiumInsights"
        );

    if (insights) {
        const list =
            Array.isArray(report.insights)
                ? report.insights
                : [];

        insights.innerHTML =
            list.map(
                insight => `
                    <div class="premium-insight-item">
                        <span class="premium-insight-check">✓</span>
                        <p>${escapePremiumHTML(insight)}</p>
                    </div>
                `
            ).join("");
    }

    const result =
        document.getElementById(
            "premiumReportResult"
        );

    if (result) {
        result.hidden = false;

        result.innerHTML = `
            <div class="premium-result-inner">
                <div class="premium-badge">
                    ✓ PREMIUM UNLOCKED
                </div>

                <h3>
                    ${escapePremiumHTML(
                        report.title ||
                        "Premium Productivity Insight"
                    )}
                </h3>

                <p>
                    ${escapePremiumHTML(
                        report.summary || ""
                    )}
                </p>
            </div>
        `;
    }

    const paymentVerified =
        data?.payment?.verified === true;

    setPremiumMessage(
        paymentVerified
            ? "✓ Payment verified on Algorand — Premium Report unlocked!"
            : "✓ Payment successful — Premium Report unlocked!"
    );
}


/* ---------------------------------------------------------
   Pera Wallet
--------------------------------------------------------- */

async function connectPremiumPera() {
    if (premiumPeraWallet && premiumWalletAddress) {
        return premiumWalletAddress;
    }

    const {
        PeraWalletConnect
    } = await loadPremiumLibraries();

    if (!premiumPeraWallet) {
        premiumPeraWallet =
            new PeraWalletConnect({
                chainId: 416002
            });

        premiumPeraWallet.connector?.on(
            "disconnect",
            () => {
                premiumWalletAddress = null;

                setPremiumMessage(
                    "Pera Wallet disconnected."
                );
            }
        );
    }

    let accounts = [];

    // Reuse an already-connected Pera session first. Calling
    // connect() while the connector already has a live session
    // throws "Session currently connected".
    try {
        accounts = await premiumPeraWallet.reconnectSession();
    } catch (reconnectError) {
        console.warn(
            "Pera reconnectSession failed; opening connect() instead:",
            reconnectError
        );
    }

    if (!accounts?.length) {
        accounts = await premiumPeraWallet.connect();
    }

    if (!accounts?.length) {
        throw new Error(
            "No Algorand account was returned by Pera Wallet."
        );
    }

    premiumWalletAddress =
        accounts[0];

    console.log(
        "✓ Pera connected:",
        premiumWalletAddress
    );

    return premiumWalletAddress;
}


/* ---------------------------------------------------------
   Pera -> x402 ClientAvmSigner

   x402 creates the payment transaction.
   Pera only signs it.
--------------------------------------------------------- */

function createPremiumPeraSigner() {
    if (
        !premiumPeraWallet ||
        !premiumWalletAddress
    ) {
        throw new Error(
            "Pera Wallet is not connected."
        );
    }

    return {
        address:
            premiumWalletAddress,

        async signTransactions(
            txns,
            indexesToSign
        ) {
            console.log(
                "\ud83d\udd10 Pera signTransactions called"
            );
            console.log(
                "Transactions:",
                txns?.length
            );
            console.log(
                "Indexes to sign:",
                indexesToSign
            );
            console.log(
                "Pera isConnected:",
                premiumPeraWallet.isConnected
            );

            if (!Array.isArray(txns) || !txns.length) {
                throw new Error(
                    "x402 did not provide any transactions to sign."
                );
            }

const {
    algosdk
} = await loadPremiumLibraries();

if (
    !algosdk ||
    typeof algosdk.decodeUnsignedTransaction !== "function"
) {
    throw new Error(
        "Algorand SDK could not load decodeUnsignedTransaction."
    );
}

console.log("✅ Algorand SDK ready");

const txnGroup = txns.map(
    (txnBytes, index) => {

        if (!(txnBytes instanceof Uint8Array)) {
            txnBytes = new Uint8Array(txnBytes);
        }

        try {

            const transaction =
                algosdk.decodeUnsignedTransaction(
                    txnBytes
                );

            console.log(
                `✅ Transaction ${index} decoded`
            );

            const shouldSign =
                !indexesToSign ||
                indexesToSign.includes(index);

            return {
                txn: transaction,
                signers: shouldSign
                    ? [premiumWalletAddress]
                    : []
            };

        } catch (error) {

            console.error(
                `❌ Failed to decode transaction ${index}:`,
                error
            );

            throw new Error(
                `Could not convert x402 transaction ${index} for Pera: ${
                    error?.message || error
                }`
            );
        }
    }
);

            console.log(
                "\u2705 x402 transactions decoded for Pera:",
                txnGroup.length
            );

            console.log(
                "\ud83d\udcf1 Opening Pera signing request..."
            );

            const signed =
                await premiumPeraWallet.signTransaction(
                    [txnGroup]
                );

            console.log(
                "\u2705 Pera signing completed"
            );

            if (!Array.isArray(signed)) {
                throw new Error(
                    "Pera returned an invalid signing response."
                );
            }

            let signedIndex = 0;

            return txns.map(
                (_, index) => {
                    const shouldSign =
                        !indexesToSign ||
                        indexesToSign.includes(index);

                    if (!shouldSign) {
                        return null;
                    }

                    const result =
                        signed[signedIndex++];

                    if (!result) {
                        throw new Error(
                            `Pera did not return a signed transaction for index ${index}.`
                        );
                    }

                    return result;
                }
            );
        }
    };
}


/* ---------------------------------------------------------
   REAL x402 PAYMENT
--------------------------------------------------------- */

async function unlockPremiumReport() {
    if (premiumPaymentBusy) {
        return;
    }

    const token =
        await getFreshPremiumAccessToken();

    if (!token) {
        setPremiumMessage(
            "Your session has expired. Please login again."
    );
        return;
    } 
    premiumPaymentBusy = true;
    setPremiumButtonsBusy(true);

    try {
        setPremiumMessage(
            "Connecting to Pera Wallet..."
        );

        await connectPremiumPera();

        setPremiumMessage(
            "Wallet connected. Preparing $0.01 USDC payment..."
        );

        console.log(
            "===================================="
        );

        console.log(
            "🚀 Better Than Yesterday x402"
        );

        console.log(
            "Payer:",
            premiumWalletAddress
        );

        console.log(
            "Network:",
            ALGORAND_TESTNET_CAIP2
        );

        console.log(
            "Amount: 0.01 USDC"
        );

        console.log(
            "===================================="
        );

        const signer =
            createPremiumPeraSigner();

        const {
            x402Client,
            ExactAvmScheme,
            wrapFetchWithPayment
        } = await loadPremiumLibraries();

        if (!x402Client) {
            throw new Error(
                "x402Client could not be loaded."
            );
        }

        if (!ExactAvmScheme) {
            throw new Error(
                "ExactAvmScheme could not be loaded from @x402/avm@2.25.0."
            );
        }

        if (!wrapFetchWithPayment) {
            throw new Error(
                "wrapFetchWithPayment could not be loaded from @x402/fetch@2.25.0."
            );
        }

        console.log(
            "\ud83d\udd27 Creating Algorand x402 client..."
        );

        const client =
            x402Client.fromConfig({
                schemes: [
                    {
                        network:
                            ALGORAND_TESTNET_CAIP2,

                        client:
                            new ExactAvmScheme(signer)
                    }
                ],

                paymentRequirementsSelector:
                    (_version, accepts) =>
                        accepts.find(
                            (a) =>
                                a.network ===
                                    ALGORAND_TESTNET_CAIP2 &&
                                a.scheme === "exact"
                        ) ?? accepts[0]
            });

        console.log(
            "\u2705 Algorand x402 client registered"
        );

        setPremiumMessage(
            "Waiting for Pera Wallet approval..."
        );

        /*
         * IMPORTANT: x402Client itself does NOT expose fetch().
         * The HTTP transport is provided by @x402/fetch.
         * wrapFetchWithPayment handles the complete 402 -> sign -> retry flow.
         */
        const fetchWithPayment =
            wrapFetchWithPayment(
                window.fetch.bind(window),
                client
            );

        console.log(
            "🚀 x402 payment-enabled fetch ready"
        );

        const response =
            await fetchWithPayment(
                PREMIUM_X402_URL,
                {
                    method: "GET",
                    headers: {
                        Authorization:
                            `Bearer ${token}`,

                        Accept:
                            "application/json"
                    }
                }
            );

        console.log(
            "x402 final status:",
            response.status
        );

        if (!response.ok) {
            const errorText =
                await response.text();

            console.error(
                "x402 server response:",
                errorText
            );

            throw new Error(
                `Premium payment failed (${response.status}).`
            );
        }

        const data =
            await response.json();

        console.log(
            "🎉 PREMIUM REPORT:",
            data
        );

        renderPremiumReport(data);

    } catch (error) {
        console.error(
            "❌ Premium x402 error:",
            error
        );

        const errorMessage =
            error?.message ||
            "Payment was cancelled or failed.";

        setPremiumMessage(
            `Payment failed: ${errorMessage}`
        );

    } finally {
        premiumPaymentBusy = false;
        setPremiumButtonsBusy(false);
    }
}


/* ---------------------------------------------------------
   Premium navigation + button events
--------------------------------------------------------- */

function setupPremiumNavigation() {
    const premiumButton =
        document.querySelector(
            '[data-section="premium"]'
        );

    if (premiumButton) {
        premiumButton.addEventListener(
            "click",
            () => {
                navigateToSection(
                    "premium"
                );
            }
        );
    }

    const unlockButton =
        document.getElementById(
            "unlockPremiumBtn"
        );

    if (unlockButton) {
        unlockButton.addEventListener(
            "click",
            unlockPremiumReport
        );
    }

    const overviewUnlockButton =
        document.getElementById(
            "unlockPremiumButton"
        );

    if (overviewUnlockButton) {
        overviewUnlockButton.addEventListener(
            "click",
            unlockPremiumReport
        );
    }

    const overviewConnectButton =
        document.getElementById(
            "connectPeraButton"
        );

    if (overviewConnectButton) {
        overviewConnectButton.addEventListener(
            "click",
            async () => {
                try {
                    setPremiumMessage(
                        "Connecting to Pera Wallet..."
                    );

                    await connectPremiumPera();

                    setPremiumMessage(
                        `Wallet connected: ${premiumWalletAddress.slice(0, 6)}...${premiumWalletAddress.slice(-6)}`
                    );

                    overviewConnectButton.textContent =
                        "Pera Connected";

                    if (overviewUnlockButton) {
                        overviewUnlockButton.disabled =
                            false;
                    }

                } catch (error) {
                    console.error(
                        "Pera connection error:",
                        error
                    );

                    setPremiumMessage(
                        error?.message ||
                        "Could not connect Pera Wallet."
                    );
                }
            }
        );
    }
}


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {
        initDashboard();
        setupPremiumNavigation();
    }
);