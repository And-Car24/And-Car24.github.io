/********************************************************************
 *  
 *  RECORRIDO 360 - CÓDIGO ORGANIZADO, OPTIMIZADO Y FUNCIONAL EN PC Y MÓVIL
 *  
 ********************************************************************/


/* ================================================================
   CONFIGURACIÓN GENERAL
================================================================ */

const container = document.querySelector("#container");

const viewer = new PANOLENS.Viewer({
    container,
    output: "console",
    autoRotate: false,
    controlBar: false,
});


/* ================================================================
   PANORÁMICAS
================================================================ */

const panoramica = Array.from({ length: 7 }, (_, i) =>
    i > 0 ? new PANOLENS.ImagePanorama(`/public/panoramas/recorrido${i}.jpg`) : null
);

// Agregar panorámicas al viewer
for (let i = 1; i <= 6; i++) viewer.add(panoramica[i]);


/* ================================================================
   COMPENSACIONES DE ROTACIÓN DEL RADAR
================================================================ */

const offset = {
    1: 0,
    2: 0,
    3: -90,
    4: 0,
    5: -90,
    6: 90,
};


/* ================================================================
   LINKS ENTRE PANORAMAS (ORIGINALES)
================================================================ */

const links = [
    [1, 2, [4332.51, -447.15, -2471.6]],
    [1, 6, [4816.69, -719.68, 1132.06]],
    [6, 3, [3896.59, -2823.18, -1358.77]],
    [6, 5, [1644.77, -2217.86, 4168.43]],
    [6, 1, [2191.82, -1109.51, -4354.87]],
    [5, 6, [145.82, -44.24, 4997.68]],
    [3, 6, [4991.33, -287.19, 63.99]],
    [3, 2, [-4995.85, 169.44, -112.83]],
    [2, 3, [-337.01, -3244.93, 3789.04]],
    [2, 4, [3492.41, -3294.97, -1395.08]],
    [2, 1, [-4962.41, -160.79, -590.43]],
    [4, 2, [-5000, 0, 0]],
];


/* ================================================================
   CREACIÓN DE HOTSPOTS PERSONALIZADOS
================================================================ */

const customLinks = [];

function addCustomLink(from, to, vec) {
    const hotspot = new PANOLENS.Infospot(350, PANOLENS.DataImage.Arrow);
    hotspot.position.set(...vec);

    panoramica[from].add(hotspot);

    customLinks.push({
        from,
        to,
        hotspot,
        origin: panoramica[from],
        target: panoramica[to],
    });
}

links.forEach(([from, to, vec]) => addCustomLink(from, to, vec));


/* ================================================================
   MINIMAPA: SELECCIÓN DE PUNTO Y RADAR
================================================================ */

function activarPunto(num) {
    document.querySelectorAll(".punto").forEach(p => p.classList.remove("activo"));

    const punto = document.getElementById(`p-pan${num}`);
    if (!punto) return;

    punto.classList.add("activo");

    const radar = document.getElementById("radar");
    radar.style.display = "block";
    radar.dataset.active = num;

    const rect = punto.getBoundingClientRect();
    const mapa = document.querySelector(".minimapa").getBoundingClientRect();

    radar.style.left = rect.left - mapa.left + rect.width / 2 - 10 + "px";
    radar.style.top = rect.top - mapa.top + rect.height / 2 - 32 + "px";
}


/* ================================================================
   ROTACIÓN DEL RADAR
================================================================ */

function actualizarRadar() {
    const radar = document.getElementById("radar");
    if (!radar || radar.style.display === "none") return;

    const active = Number(radar.dataset.active || 1);
    const angle = viewer.getControl().getAzimuthalAngle();
    const degrees = -THREE.Math.radToDeg(angle);

    radar.style.transform = `rotate(${degrees + (offset[active] || 0)}deg)`;
}

viewer.addUpdateCallback(actualizarRadar);


/* ================================================================
   ANIMACIÓN DE TRANSICIÓN ENTRE PANORAMAS
================================================================ */

function zoomTransition(panoramaDestino) {
    const minimapa = document.querySelector(".minimapa");

    if (minimapa) minimapa.style.opacity = "0";

    const zoomState = { scale: 1.0 };
    const containerStyle = viewer.getContainer().style;

    new TWEEN.Tween(zoomState)
        .to({ scale: 1.5 }, 300)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => {
            containerStyle.transform = `scale(${zoomState.scale})`;
        })
        .onComplete(() => {
            viewer.setPanorama(panoramaDestino);

            new TWEEN.Tween(zoomState)
                .to({ scale: 1.5 }, 300)
                .easing(TWEEN.Easing.Quadratic.Out)
                .onUpdate(() => {
                    containerStyle.transform = `scale(${zoomState.scale})`;
                })
                .onComplete(() => {
                    containerStyle.transform = "none";
                    if (minimapa) minimapa.style.opacity = "1";
                })
                .start();
        })
        .start();
}


/* ================================================================
   LOOP PRINCIPAL DE ANIMACIÓN (TWEEN)
================================================================ */

function animate() {
    if (typeof TWEEN !== "undefined") TWEEN.update();
    requestAnimationFrame(animate);
}
animate();


/* ================================================================
   EVENTO: AL ENTRAR A UNA PANORÁMICA
================================================================ */

for (let i = 1; i <= 6; i++) {
    panoramica[i].addEventListener("enter", () => activarPunto(i));
}


/* ================================================================
   CLICK EN PUNTOS DEL MINIMAPA
================================================================ */

for (let i = 1; i <= 6; i++) {
    const punto = document.getElementById(`p-pan${i}`);
    if (punto) {
        punto.addEventListener("click", () => zoomTransition(panoramica[i]));
        punto.addEventListener("touchstart", () => zoomTransition(panoramica[i])); // móvil
    }
}


/* ================================================================
   RAYCASTER PARA HOTSPOTS (PC + MÓVIL)
================================================================ */

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ----- PC -----
viewer.container.addEventListener("mousedown", (e) => {
    detectarHotspot(e.clientX, e.clientY);
});

// ----- MÓVIL -----
viewer.container.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    detectarHotspot(touch.clientX, touch.clientY);
});

function detectarHotspot(clientX, clientY) {
    const rect = viewer.container.getBoundingClientRect();

    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, viewer.camera);

    const intersects = raycaster.intersectObjects(viewer.panorama.children, true);
    if (!intersects.length) return;

    const obj = intersects[0].object;
    const link = customLinks.find(c => c.hotspot === obj);

    if (link) zoomTransition(link.target);
}


/* ================================================================
   MINIMAPA PARA MÓVILES
================================================================ */

document.addEventListener("DOMContentLoaded", () => {

    const minimapa = document.querySelector(".minimapa");
    const toggleButton = document.getElementById("toggle-minimap");
    const esMovil = () => window.innerWidth <= 767;

    if (!minimapa || !toggleButton) return;

    function toggleMinimapa(mostrar) {
        minimapa.classList.toggle("oculto", !mostrar);
        toggleButton.innerHTML = mostrar
            ? '<i class="fa-solid fa-x"></i>'
            : '<i class="fa-solid fa-map-location-dot"></i>';
    }

    if (esMovil()) {
        toggleMinimapa(true);
        setTimeout(() => toggleMinimapa(false), 1000);

        toggleButton.addEventListener("click", () => {
            toggleMinimapa(minimapa.classList.contains("oculto"));
        });

    } else {
        toggleButton.style.display = "none";
        minimapa.classList.remove("oculto");
    }

    window.addEventListener("resize", () => location.reload());
});


/* ================================================================
   INICIO
================================================================ */

activarPunto(1);
viewer.setPanorama(panoramica[1]);

