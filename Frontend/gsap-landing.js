document.addEventListener("DOMContentLoaded", () => {

    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
        console.warn("GSAP or ScrollTrigger not loaded.");
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const prefersReducedMotion =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
        gsap.set([
            ".hero-eyebrow",
            ".hero-heading .word",
            ".hero-description",
            ".hero-actions",
            ".hero-login-text",
            ".three-card",
            ".section-heading",
            ".story-copy",
            ".landing-heatmap-wrapper",
            ".feature-card",
            ".philosophy-content",
            ".final-cta-content"
        ], {
            opacity: 1,
            y: 0,
            x: 0,
            scale: 1,
            rotation: 0
        });

        return;
    }


    /* =========================================================
       HERO INTRO
    ========================================================= */

    const heroTimeline = gsap.timeline({
        defaults: {
            ease: "power3.out"
        }
    });

    heroTimeline
        .from(".hero-eyebrow", {
            opacity: 0,
            y: 30,
            duration: 0.8
        })
        .from(".hero-heading .word", {
            opacity: 0,
            y: 90,
            rotationX: -55,
            transformOrigin: "50% 100%",
            stagger: 0.14,
            duration: 1.1
        }, "-=0.35")
        .from(".hero-description", {
            opacity: 0,
            y: 30,
            duration: 0.8
        }, "-=0.65")
        .from(".hero-actions", {
            opacity: 0,
            y: 25,
            duration: 0.7
        }, "-=0.5")
        .from(".hero-login-text", {
            opacity: 0,
            y: 15,
            duration: 0.5
        }, "-=0.4")
        .from(".three-card", {
            opacity: 0,
            scale: 0.7,
            y: 35,
            stagger: 0.12,
            duration: 0.8,
            ease: "back.out(1.4)"
        }, "-=0.8");


    /* =========================================================
       HERO PARALLAX
    ========================================================= */

    gsap.to(".hero-copy", {
        yPercent: -12,
        ease: "none",
        scrollTrigger: {
            trigger: ".hero-section",
            start: "top top",
            end: "bottom top",
            scrub: 1
        }
    });

    gsap.to(".hero-visual", {
        yPercent: 18,
        scale: 1.05,
        ease: "none",
        scrollTrigger: {
            trigger: ".hero-section",
            start: "top top",
            end: "bottom top",
            scrub: 1
        }
    });

    gsap.to(".scroll-indicator", {
        opacity: 0,
        y: 30,
        ease: "none",
        scrollTrigger: {
            trigger: ".hero-section",
            start: "top top",
            end: "25% top",
            scrub: 1
        }
    });


    /* =========================================================
       DIFFERENCE SECTION
    ========================================================= */

    gsap.from(".difference-section .section-heading", {
        opacity: 0,
        y: 80,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
            trigger: ".difference-section",
            start: "top 75%",
            toggleActions: "play none none reverse"
        }
    });

    gsap.from(".comparison-yesterday", {
        opacity: 0,
        x: -120,
        rotationY: 10,
        duration: 1.1,
        ease: "power3.out",
        scrollTrigger: {
            trigger: ".comparison-stage",
            start: "top 75%",
            toggleActions: "play none none reverse"
        }
    });

    gsap.from(".comparison-today", {
        opacity: 0,
        x: 120,
        rotationY: -10,
        duration: 1.1,
        ease: "power3.out",
        scrollTrigger: {
            trigger: ".comparison-stage",
            start: "top 75%",
            toggleActions: "play none none reverse"
        }
    });

    gsap.from(".comparison-arrow", {
        opacity: 0,
        scale: 0,
        duration: 0.8,
        delay: 0.25,
        ease: "back.out(1.7)",
        scrollTrigger: {
            trigger: ".comparison-stage",
            start: "top 70%",
            toggleActions: "play none none reverse"
        }
    });

    gsap.from(".comparison-today .comparison-score strong", {
        textContent: 0,
        duration: 1.5,
        ease: "power2.out",
        snap: {
            textContent: 1
        },
        scrollTrigger: {
            trigger: ".comparison-today",
            start: "top 70%",
            toggleActions: "play none none reverse"
        }
    });


    /* =========================================================
       COMPARISON BARS
    ========================================================= */

    document.querySelectorAll(".comparison-card").forEach(card => {

        const bars = card.querySelectorAll(".metric-track span");

        bars.forEach(bar => {

            const finalWidth = bar.style.width;

            gsap.set(bar, {
                width: 0
            });

            gsap.to(bar, {
                width: finalWidth,
                duration: 1.2,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: card,
                    start: "top 75%",
                    toggleActions: "play none none reverse"
                }
            });

        });

    });


    /* =========================================================
       DIFFERENCE STATEMENT
    ========================================================= */

    gsap.from(".difference-statement", {
        opacity: 0,
        y: 40,
        duration: 0.9,
        scrollTrigger: {
            trigger: ".difference-statement",
            start: "top 85%",
            toggleActions: "play none none reverse"
        }
    });


    /* =========================================================
       STORY SECTION
    ========================================================= */

    gsap.from(".story-copy", {
        opacity: 0,
        x: -100,
        duration: 1.1,
        ease: "power3.out",
        scrollTrigger: {
            trigger: ".story-section",
            start: "top 70%",
            toggleActions: "play none none reverse"
        }
    });

    gsap.from(".landing-heatmap-wrapper", {
        opacity: 0,
        x: 100,
        rotateY: -8,
        scale: 0.92,
        duration: 1.2,
        ease: "power3.out",
        scrollTrigger: {
            trigger: ".story-section",
            start: "top 70%",
            toggleActions: "play none none reverse"
        }
    });


    /* =========================================================
       HEATMAP CINEMATIC REVEAL
    ========================================================= */

    gsap.from(".landing-heatmap .heat-cell", {
        opacity: 0,
        scale: 0.2,
        stagger: {
            each: 0.008,
            from: "random"
        },
        duration: 0.5,
        ease: "back.out(1.5)",
        scrollTrigger: {
            trigger: ".landing-heatmap-wrapper",
            start: "top 75%",
            toggleActions: "play none none reverse"
        }
    });


    /* =========================================================
       FEATURE SECTION
    ========================================================= */

    gsap.from(".features-section .section-heading", {
        opacity: 0,
        y: 80,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
            trigger: ".features-section",
            start: "top 75%",
            toggleActions: "play none none reverse"
        }
    });


    gsap.from(".feature-card", {
        opacity: 0,
        y: 100,
        scale: 0.9,
        rotationX: 12,
        stagger: 0.16,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
            trigger: ".feature-grid",
            start: "top 78%",
            toggleActions: "play none none reverse"
        }
    });


    /* =========================================================
       FEATURE CARD FLOAT
    ========================================================= */

    document.querySelectorAll(".feature-card").forEach((card, index) => {

        gsap.to(card, {
            y: index % 2 === 0 ? -8 : 8,
            duration: 2.5 + index * 0.2,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });

    });


    /* =========================================================
       PHILOSOPHY
    ========================================================= */

    gsap.from(".philosophy-content", {
        opacity: 0,
        y: 100,
        scale: 0.92,
        duration: 1.3,
        ease: "power3.out",
        scrollTrigger: {
            trigger: ".philosophy-section",
            start: "top 70%",
            toggleActions: "play none none reverse"
        }
    });


    gsap.to(".philosophy-orbit", {
        rotation: 360,
        duration: 20,
        repeat: -1,
        ease: "none"
    });


    /* =========================================================
       PHILOSOPHY TEXT PARALLAX
    ========================================================= */

    gsap.to(".philosophy-content", {
        yPercent: -10,
        ease: "none",
        scrollTrigger: {
            trigger: ".philosophy-section",
            start: "top bottom",
            end: "bottom top",
            scrub: 1.5
        }
    });


    /* =========================================================
       FINAL CTA
    ========================================================= */

    gsap.from(".final-cta-content", {
        opacity: 0,
        y: 100,
        scale: 0.9,
        duration: 1.2,
        ease: "power3.out",
        scrollTrigger: {
            trigger: ".final-cta-section",
            start: "top 75%",
            toggleActions: "play none none reverse"
        }
    });


    /* =========================================================
       FINAL CTA GLOW
    ========================================================= */

    gsap.to(".final-cta-glow", {
        scale: 1.25,
        opacity: 0.8,
        duration: 2.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
    });


    /* =========================================================
       GLOBAL SECTION PARALLAX
    ========================================================= */

    document.querySelectorAll(".landing-section").forEach(section => {

        if (
            section.classList.contains("hero-section") ||
            section.classList.contains("philosophy-section")
        ) {
            return;
        }

        const children = section.querySelectorAll(
            ".section-heading, .story-copy, .feature-card, .comparison-card"
        );

        if (!children.length) return;

        gsap.to(children, {
            y: -20,
            ease: "none",
            scrollTrigger: {
                trigger: section,
                start: "top bottom",
                end: "bottom top",
                scrub: 2
            }
        });

    });


    /* =========================================================
       MOUSE PARALLAX — HERO
    ========================================================= */

    const hero = document.querySelector(".hero-section");

    if (hero) {

        hero.addEventListener("mousemove", e => {

            const rect = hero.getBoundingClientRect();

            const x =
                (e.clientX - rect.left) / rect.width - 0.5;

            const y =
                (e.clientY - rect.top) / rect.height - 0.5;

            gsap.to(".hero-copy", {
                x: x * -10,
                y: y * -6,
                duration: 0.8,
                ease: "power2.out",
                overwrite: true
            });

            gsap.to(".hero-visual", {
                x: x * 14,
                y: y * 10,
                duration: 1,
                ease: "power2.out",
                overwrite: true
            });

        });

        hero.addEventListener("mouseleave", () => {

            gsap.to(".hero-copy", {
                x: 0,
                y: 0,
                duration: 1,
                ease: "power3.out"
            });

            gsap.to(".hero-visual", {
                x: 0,
                y: 0,
                duration: 1,
                ease: "power3.out"
            });

        });

    }


    /* =========================================================
       REFRESH AFTER EVERYTHING LOADS
    ========================================================= */

    window.addEventListener("load", () => {
        setTimeout(() => {
            ScrollTrigger.refresh();
        }, 500);
    });

});