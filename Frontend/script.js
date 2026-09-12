(function(){

    const nav = document.getElementById("nav");
    const burger = document.getElementById("navBurger");
    const mobile = document.getElementById("navMobile");

    const reduced =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;


    /* NAV */

    window.addEventListener("scroll",()=>{

        nav.classList.toggle(
            "is-scrolled",
            window.scrollY > 40
        );

    },{passive:true});


    if(burger){

        burger.addEventListener("click",()=>{

            const open =
                mobile.classList.toggle("is-open");

            burger.setAttribute(
                "aria-expanded",
                String(open)
            );

        });

    }


    mobile?.querySelectorAll("a").forEach(link=>{

        link.addEventListener("click",()=>{

            mobile.classList.remove("is-open");

            burger.setAttribute(
                "aria-expanded",
                "false"
            );

        });

    });


    /* HERO CARD PARALLAX */

    if(!reduced){

        const cards =
            document.querySelectorAll(".float-card");

        window.addEventListener("pointermove",e=>{

            const x =
                e.clientX/window.innerWidth-.5;

            const y =
                e.clientY/window.innerHeight-.5;

            cards.forEach(card=>{

                const depth =
                    Number(card.dataset.depth || .5);

                gsap.to(card,{
                    x:x*40*depth,
                    y:y*30*depth,
                    duration:.8,
                    ease:"power3.out",
                    overwrite:true
                });

            });

        });

    }


    /* INTRO */

    gsap.from(
        ".hero-kicker,.hero-title,.hero-sub,.hero-ctas",
        {
            opacity:0,
            y:25,
            duration:1,
            stagger:.1,
            delay:.1,
            ease:"power3.out"
        }
    );


    gsap.from(
        ".float-card",
        {
            opacity:0,
            y:25,
            duration:1,
            stagger:.12,
            delay:.5,
            ease:"power3.out"
        }
    );


    /* REVEALS */

    gsap.utils.toArray(
        ".section-title,.section-lede"
    ).forEach(el=>{

        gsap.from(el,{
            opacity:0,
            y:30,
            duration:.9,
            ease:"power3.out",
            scrollTrigger:{
                trigger:el,
                start:"top 85%"
            }
        });

    });


    gsap.utils.toArray(
        ".metric-card,.stat-item,.feature-row"
    ).forEach(el=>{

        gsap.from(el,{
            opacity:0,
            y:30,
            duration:.8,
            ease:"power3.out",
            scrollTrigger:{
                trigger:el,
                start:"top 85%"
            }
        });

    });


    /* HEATMAP */

    const heatmap =
        document.getElementById("heatmap");

    const tooltip =
        document.getElementById("heatmapTooltip");


    if(heatmap){

        const fragment =
            document.createDocumentFragment();

        for(let i=0;i<365;i++){

            const cell =
                document.createElement("div");

            const score =
                Math.floor(Math.random()*101);

            let level=0;

            if(score>=80) level=4;
            else if(score>=60) level=3;
            else if(score>=40) level=2;
            else if(score>=20) level=1;

            const date =
                new Date();

            date.setDate(
                date.getDate()-(364-i)
            );

            cell.className =
                `heatmap-cell heat-${level}`;

            cell.dataset.date =
                date.toLocaleDateString(
                    undefined,
                    {
                        month:"short",
                        day:"numeric",
                        year:"numeric"
                    }
                );

            cell.dataset.score=score;

            fragment.appendChild(cell);
        }

        heatmap.appendChild(fragment);


        heatmap.addEventListener(
            "pointermove",
            e=>{

                const cell =
                    e.target.closest(".heatmap-cell");

                if(!cell){

                    tooltip?.classList.remove(
                        "is-visible"
                    );

                    return;
                }

                if(tooltip){

                    tooltip.innerHTML =
                        `<strong>${cell.dataset.date}</strong>
                         <br>Score: ${cell.dataset.score}`;

                    tooltip.classList.add(
                        "is-visible"
                    );
                }

            }
        );

        heatmap.addEventListener(
            "pointerleave",
            ()=>{
                tooltip?.classList.remove(
                    "is-visible"
                );
            }
        );

    }


    /* LANDING COMPARISON */

    async function loadComparison(){

        const token =
            localStorage.getItem("access_token");

        if(!token) return;

        try{

            const response =
                await fetch(
                    `${window.BTY_CONFIG.API_BASE}/api/dashboard/comparison/`,
                    {
                        headers:{
                            Authorization:`Bearer ${token}`
                        }
                    }
                );

            if(!response.ok) return;

            const data =
                await response.json();

            const yesterday =
                document.getElementById(
                    "landingYesterday"
                );

            const today =
                document.getElementById(
                    "landingToday"
                );

            const difference =
                document.getElementById(
                    "landingDifference"
                );

            if(yesterday)
                yesterday.textContent =
                    Math.round(data.yesterday);

            if(today)
                today.textContent =
                    Math.round(data.today);

            if(difference)
                difference.textContent =
                    data.difference > 0
                        ? `+${data.difference}`
                        : data.difference;

        }catch(error){

            console.warn(
                "Landing API unavailable"
            );

        }

    }

    loadComparison();

})();