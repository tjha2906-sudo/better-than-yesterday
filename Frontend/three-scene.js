import * as THREE from "three";

const reduced =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function rendererFor(canvas){
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias:true,
        alpha:true
    });

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio,2)
    );

    renderer.setSize(
        canvas.clientWidth,
        canvas.clientHeight,
        false
    );

    return renderer;
}

function resize(renderer,camera,canvas){

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    if(canvas.width !== w || canvas.height !== h){

        renderer.setSize(w,h,false);

        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }
}


function createHero(){

    const canvas = document.getElementById("orb-canvas");

    if(!canvas) return;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
        45,
        canvas.clientWidth / canvas.clientHeight,
        .1,
        100
    );

    camera.position.z = 8;

    const renderer = rendererFor(canvas);

    const group = new THREE.Group();

    scene.add(group);


    const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.5,4),
        new THREE.MeshBasicMaterial({
            color:0xe8963c,
            transparent:true,
            opacity:.1
        })
    );

    group.add(core);


    const wire = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.9,2),
        new THREE.MeshBasicMaterial({
            color:0xf0ac5c,
            wireframe:true,
            transparent:true,
            opacity:.4
        })
    );

    group.add(wire);


    const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
            map:createGlow(),
            color:0xe8963c,
            transparent:true,
            opacity:.8,
            depthWrite:false
        })
    );

    glow.scale.set(6,6,1);

    group.add(glow);


    const ring1 = orbit(2.6,50,0x4fd1b0);
    const ring2 = orbit(3.2,35,0xe8963c);

    group.add(ring1,ring2);


    const particles = particleField(600,18);

    scene.add(particles);


    const mouse = {x:0,y:0};

    window.addEventListener("pointermove",e=>{

        mouse.x =
            (e.clientX / window.innerWidth) * 2 - 1;

        mouse.y =
            (e.clientY / window.innerHeight) * 2 - 1;

    });


    const clock = new THREE.Clock();


    function animate(){

        requestAnimationFrame(animate);

        resize(renderer,camera,canvas);

        const t = clock.getElapsedTime();

        if(!reduced){

            group.rotation.y =
                t*.15 + mouse.x*.15;

            group.rotation.x =
                Math.sin(t*.3)*.08 + mouse.y*.1;

            ring1.rotation.z = t*.25;
            ring2.rotation.z = -t*.18;

            particles.rotation.y = t*.01;

            core.scale.setScalar(
                1 + Math.sin(t*1.5)*.025
            );
        }

        renderer.render(scene,camera);
    }

    animate();
}


function orbit(radius,count,color){

    const group = new THREE.Group();

    const geometry =
        new THREE.SphereGeometry(.035,8,8);

    const material =
        new THREE.MeshBasicMaterial({
            color,
            transparent:true,
            opacity:.65
        });

    for(let i=0;i<count;i++){

        const a =
            (i/count)*Math.PI*2;

        const point =
            new THREE.Mesh(geometry,material);

        point.position.set(
            Math.cos(a)*radius,
            Math.sin(a)*radius,
            0
        );

        group.add(point);
    }

    group.rotation.x = Math.PI/2.4;

    return group;
}


function particleField(count,spread){

    const positions =
        new Float32Array(count*3);

    for(let i=0;i<count;i++){

        positions[i*3] =
            (Math.random()-.5)*spread;

        positions[i*3+1] =
            (Math.random()-.5)*spread;

        positions[i*3+2] =
            (Math.random()-.5)*spread-4;
    }

    const geometry =
        new THREE.BufferGeometry();

    geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions,3)
    );

    return new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
            color:0xf0efea,
            size:.018,
            transparent:true,
            opacity:.3
        })
    );
}


function createGlow(){

    const size=128;

    const canvas=document.createElement("canvas");

    canvas.width=canvas.height=size;

    const ctx=canvas.getContext("2d");

    const gradient =
        ctx.createRadialGradient(
            64,64,0,
            64,64,64
        );

    gradient.addColorStop(
        0,
        "rgba(255,255,255,.9)"
    );

    gradient.addColorStop(
        1,
        "rgba(255,255,255,0)"
    );

    ctx.fillStyle=gradient;
    ctx.fillRect(0,0,size,size);

    return new THREE.CanvasTexture(canvas);
}


createHero();