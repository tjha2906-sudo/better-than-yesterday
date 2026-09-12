document.addEventListener("DOMContentLoaded", () => {

    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
        console.error("GSAP / ScrollTrigger not loaded");
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    const welcome = document.getElementById("welcomeScreen");

    if (!welcome) return;


    /* =====================================================
       LANDING MODE
    ===================================================== */

    function syncLandingMode() {
        document.body.classList.toggle(
            "landing-mode",
            welcome.classList.contains("active")
        );

        if (welcome.classList.contains("active")) {
            setTimeout(() => ScrollTrigger.refresh(), 100);
        }
    }

    syncLandingMode();

    new MutationObserver(syncLandingMode).observe(welcome, {
        attributes: true,
        attributeFilter: ["class"]
    });


    /* =====================================================
       SMOOTH SCROLL
    ===================================================== */

    document.querySelectorAll("[data-scroll-to]").forEach(button => {

        button.addEventListener("click", () => {

            const target = document.getElementById(
                button.dataset.scrollTo
            );

            if (!target) return;

            gsap.to(window, {
                duration: 1.2,
                scrollTo: {
                    y: target,
                    offsetY: 0
                },
                ease: "power3.inOut"
            });

        });

    });


    /* =====================================================
       HEATMAP
    ===================================================== */

    const heatmap = document.getElementById("landingHeatmap");

    if (heatmap) {

        heatmap.innerHTML = "";

        for (let i = 0; i < 365; i++) {

            const cell = document.createElement("div");

            const random = Math.random();

            let level = 0;

            if (random > 0.88) level = 4;
            else if (random > 0.70) level = 3;
            else if (random > 0.48) level = 2;
            else if (random > 0.25) level = 1;

            cell.className = `heat-cell level-${level}`;

            const day = new Date();

            day.setDate(
                day.getDate() - (364 - i)
            );

            cell.title =
                `${day.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                })}`;

            heatmap.appendChild(cell);
        }
    }


    /* =====================================================
       TOPBAR
    ===================================================== */

    const topbar = document.querySelector(".topbar");

    ScrollTrigger.create({

        start: 50,

        onUpdate: self => {

            if (!topbar) return;

            topbar.classList.toggle(
                "topbar-scrolled",
                self.scroll() > 50
            );

        }

    });


    if (reduceMotion) {

        gsap.set(
            ".reveal,.reveal-left,.reveal-right",
            {
                opacity: 1,
                x: 0,
                y: 0,
                scale: 1,
                filter: "blur(0px)"
            }
        );

        return;
    }


    /* =====================================================
       HERO — CINEMATIC ENTRANCE
    ===================================================== */

    const heroTimeline = gsap.timeline({
        defaults: {
            ease: "power4.out"
        }
    });

    heroTimeline
        .from(".hero-eyebrow", {
            y: 30,
            opacity: 0,
            duration: 0.8
        })
        .from(".hero-heading .word", {
            yPercent: 120,
            opacity: 0,
            rotateX: -70,
            stagger: 0.08,
            duration: 1.15,
            ease: "power4.out"
        }, "-=0.45")
        .from(".hero-description", {
            y: 35,
            opacity: 0,
            filter: "blur(10px)",
            duration: 0.8
        }, "-=0.65")
        .from(".hero-actions", {
            y: 25,
            opacity: 0,
            duration: 0.7
        }, "-=0.5")
        .from(".hero-login-text", {
            y: 15,
            opacity: 0,
            duration: 0.5
        }, "-=0.4")
        .from(".hero-visual", {
            scale: 0.72,
            opacity: 0,
            rotateY: -18,
            filter: "blur(15px)",
            duration: 1.4,
            ease: "power4.out"
        }, "-=1");


    /* =====================================================
       HERO — SCROLL TRANSFORMATION
    ===================================================== */

    const heroScroll = gsap.timeline({
        scrollTrigger: {
            trigger: "#heroSection",
            start: "top top",
            end: "bottom top",
            scrub: 1.4,
            pin: true,
            anticipatePin: 1
        }
    });

    heroScroll
        .to(".hero-copy", {
            x: -180,
            y: -70,
            opacity: 0,
            scale: 0.82,
            filter: "blur(10px)",
            duration: 1
        }, 0)

        .to(".hero-visual", {
            x: 90,
            y: -35,
            scale: 1.18,
            rotateY: 12,
            duration: 1
        }, 0)

        .to(".three-card-streak", {
            x: 80,
            y: -70,
            rotate: 8,
            duration: 1
        }, 0)

        .to(".three-card-progress", {
            x: -80,
            y: -30,
            rotate: -7,
            duration: 1
        }, 0)

        .to(".three-card-focus", {
            x: 90,
            y: 50,
            rotate: 7,
            duration: 1
        }, 0)

        .to(".three-card-goal", {
            x: -70,
            y: 70,
            rotate: -7,
            duration: 1
        }, 0)

        .to(".scroll-indicator", {
            opacity: 0,
            y: 30,
            duration: 0.4
        }, 0);


    /* =====================================================
       DIFFERENCE — PINNED STORY
    ===================================================== */

    const differenceTimeline = gsap.timeline({
        scrollTrigger: {
            trigger: "#differenceSection",
            start: "top top",
            end: "+=1800",
            scrub: 1,
            pin: true,
            anticipatePin: 1
        }
    });

    differenceTimeline

        .from("#differenceSection .section-heading", {
            y: 100,
            opacity: 0,
            filter: "blur(15px)",
            duration: 0.7
        })

        .from(".comparison-yesterday", {
            x: -250,
            rotateY: -25,
            opacity: 0,
            scale: 0.8,
            duration: 0.9
        }, "-=0.25")

        .from(".comparison-today", {
            x: 250,
            rotateY: 25,
            opacity: 0,
            scale: 0.8,
            duration: 0.9
        }, "<")

        .from(".comparison-arrow", {
            scale: 0,
            opacity: 0,
            duration: 0.6
        })

        .to(".comparison-yesterday", {
            x: -45,
            scale: 0.92,
            opacity: 0.45,
            duration: 0.7
        })

        .to(".comparison-today", {
            x: 45,
            scale: 1.08,
            boxShadow: "0 30px 100px rgba(41,216,197,.14)",
            duration: 0.7
        }, "<")

        .from(".difference-statement", {
            y: 60,
            opacity: 0,
            duration: 0.5
        })

        .to(".comparison-arrow-circle", {
            scale: 1.3,
            rotation: 20,
            duration: 0.4,
            yoyo: true,
            repeat: 1
        });


    /* =====================================================
       STORY / HEATMAP — ZOOM
    ===================================================== */

    const storyTimeline = gsap.timeline({
        scrollTrigger: {
            trigger: "#storySection",
            start: "top top",
            end: "+=1400",
            scrub: 1,
            pin: true,
            anticipatePin: 1
        }
    });

    storyTimeline

        .from(".story-copy", {
            x: -180,
            opacity: 0,
            filter: "blur(15px)",
            duration: 0.8
        })

        .from(".landing-heatmap-wrapper", {
            x: 220,
            scale: 0.7,
            rotateY: -18,
            opacity: 0,
            duration: 0.9
        }, "<")

        .from(".story-stat", {
            y: 40,
            opacity: 0,
            stagger: 0.15,
            duration: 0.5
        })

        .to(".landing-heatmap", {
            scale: 1.08,
            duration: 0.8
        })

        .to(".heat-cell", {
            opacity: 1,
            scale: 1,
            stagger: {
                each: 0.004,
                from: "random"
            },
            duration: 0.5
        }, "-=0.5");


    /* =====================================================
       FEATURES — CINEMATIC CARD ENTRANCE
    ===================================================== */

    const featureCards =
        gsap.utils.toArray(".feature-card");

    featureCards.forEach((card, index) => {

        gsap.from(card, {

            scrollTrigger: {
                trigger: card,
                start: "top 90%",
                end: "top 45%",
                scrub: 1
            },

            y: 120,
            opacity: 0,
            scale: 0.82,
            rotateX: 18,
            filter: "blur(12px)",

            duration: 1,

            delay: index * 0.08,

            ease: "power3.out"

        });

    });


    /* =====================================================
       FEATURES — PREVIEW PARALLAX
    ===================================================== */

    featureCards.forEach(card => {

        const preview =
            card.querySelector(".feature-preview");

        if (!preview) return;

        gsap.to(preview, {

            y: -35,

            scrollTrigger: {
                trigger: card,
                start: "top bottom",
                end: "bottom top",
                scrub: 1
            }

        });

    });


    /* =====================================================
       PHILOSOPHY — BIG TYPOGRAPHY
    ===================================================== */

    const philosophyTimeline = gsap.timeline({

        scrollTrigger: {
            trigger: "#philosophySection",
            start: "top top",
            end: "+=1400",
            scrub: 1,
            pin: true,
            anticipatePin: 1
        }

    });

    philosophyTimeline

        .from(".philosophy-orbit", {
            scale: 0.2,
            opacity: 0,
            rotation: -90,
            duration: 1
        })

        .from(".philosophy-content .section-kicker", {
            y: 40,
            opacity: 0,
            duration: 0.5
        })

        .from(".philosophy-content h2", {
            y: 130,
            opacity: 0,
            scale: 0.8,
            filter: "blur(20px)",
            duration: 1
        }, "-=0.2")

        .from(".philosophy-content p", {
            y: 50,
            opacity: 0,
            duration: 0.6
        })

        .from(".philosophy-mark", {
            scale: 0,
            opacity: 0,
            duration: 0.5
        })

        .to(".philosophy-content h2", {
            scale: 1.08,
            duration: 0.8
        });


    /* =====================================================
       FINAL CTA — CINEMATIC ARRIVAL
    ===================================================== */

    const finalTimeline = gsap.timeline({

        scrollTrigger: {
            trigger: "#finalCtaSection",
            start: "top 80%",
            end: "bottom 60%",
            scrub: 1
        }

    });

    finalTimeline

        .from(".final-cta-glow", {
            scale: 0.2,
            opacity: 0,
            duration: 1
        })

        .from(".final-cta-content .section-kicker", {
            y: 50,
            opacity: 0,
            duration: 0.5
        }, "-=0.5")

        .from(".final-cta-content h2", {
            y: 120,
            opacity: 0,
            scale: 0.75,
            filter: "blur(20px)",
            duration: 1
        })

        .from(".final-cta-content p", {
            y: 40,
            opacity: 0,
            duration: 0.5
        })

        .from(".final-cta-button", {
            y: 40,
            scale: 0.7,
            opacity: 0,
            duration: 0.6
        })

        .from(".final-cta-note", {
            opacity: 0,
            duration: 0.4
        });


    /* =====================================================
       MOUSE PARALLAX
    ===================================================== */

    const heroVisual =
        document.querySelector(".hero-visual");

    if (heroVisual) {

        heroVisual.addEventListener("mousemove", e => {

            const rect =
                heroVisual.getBoundingClientRect();

            const x =
                (e.clientX - rect.left) /
                rect.width - 0.5;

            const y =
                (e.clientY - rect.top) /
                rect.height - 0.5;

            gsap.to(".three-card", {
                x: x * 12,
                y: y * 12,
                duration: 0.5,
                overwrite: "auto"
            });

        });

        heroVisual.addEventListener("mouseleave", () => {

            gsap.to(".three-card", {
                x: 0,
                y: 0,
                duration: 0.8,
                ease: "power3.out"
            });

        });

    }


    /* =====================================================
       FEATURE CARD 3D TILT
    ===================================================== */

    featureCards.forEach(card => {

        card.addEventListener("mousemove", e => {

            const rect =
                card.getBoundingClientRect();

            const x =
                e.clientX - rect.left;

            const y =
                e.clientY - rect.top;

            const rotateY =
                ((x / rect.width) - 0.5) * 8;

            const rotateX =
                ((y / rect.height) - 0.5) * -8;

            gsap.to(card, {
                rotateX,
                rotateY,
                y: -8,
                duration: 0.35,
                ease: "power2.out",
                overwrite: "auto"
            });

        });

        card.addEventListener("mouseleave", () => {

            gsap.to(card, {
                rotateX: 0,
                rotateY: 0,
                y: 0,
                duration: 0.6,
                ease: "power3.out"
            });

        });

    });


    /* =====================================================
       REFRESH
    ===================================================== */

    window.addEventListener("resize", () => {
        ScrollTrigger.refresh();
    });

    setTimeout(() => {
        ScrollTrigger.refresh();
    }, 500);

}); 