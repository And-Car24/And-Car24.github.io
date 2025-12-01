const container = document.querySelector("#container")
const minimapa = document.querySelector(".minimapa")
const toggleButton = document.getElementById("toggle-minimap")
const esMovil = () => window.innerWidth <= 767
const viewer = new PANOLENS.Viewer({
  container: container,
  output: "console",
  autoRotate: false,
  controlBar: false,
});

const panoramica = Array.from({ length: 7 }, (_, i) =>
  i > 0 ? new PANOLENS.ImagePanorama(`/public/panoramas/recorrido${i}.jpg`) : null
);

for (let i = 1; i <= 6; i++) viewer.add(panoramica[i]);

const offset = {
  1: 0,
  2: 0,
  3: -90,
  4: 0,
  5: -90,
  6: 90,
};

activarPunto(1);
viewer.setPanorama(panoramica[1]);

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

links.forEach(([from, to, vec]) =>
  panoramica[from].link(panoramica[to], new THREE.Vector3(...vec))
);

function activarPunto(num) {
  document
    .querySelectorAll(".punto")
    .forEach((p) => p.classList.remove("activo"));

  const punto = document.getElementById(`p-pan${num}`);
  if (punto) {
    punto.classList.add("activo");

    const radar = document.getElementById("radar");
    radar.style.display = "block";

    const rect = punto.getBoundingClientRect();
    const mapa = document.querySelector(".minimapa").getBoundingClientRect();

    radar.style.left = rect.left - mapa.left + rect.width / 2 - 10 + "px";
    radar.style.top = rect.top - mapa.top + rect.height / 2 - 32  + "px";

    radar.dataset.active = num;
  }
}

for (let i = 1; i <= 6; i++) {
  panoramica[i].addEventListener("enter", () => activarPunto(i));
}

for (let i = 1; i <= 6; i++) {
  const punto = document.getElementById(`p-pan${i}`);
  if (punto) {
    punto.addEventListener("click", () => viewer.setPanorama(panoramica[i]));
  }
}

function actualizarRadar() {
  const radar = document.getElementById("radar");
  if (!radar || radar.style.display === "none") return;
  const active = Number(radar.dataset.active || 1);
  const angle = viewer.getControl().getAzimuthalAngle();
  const degrees = -THREE.Math.radToDeg(angle);
  const finalRotation = degrees + (offset[active] || 0);
  radar.style.transform = `rotate(${finalRotation}deg)`;
}
viewer.addUpdateCallback(actualizarRadar);


document.addEventListener('DOMContentLoaded', () => {
    const minimapa = document.querySelector(".minimapa");
    const toggleButton = document.getElementById("toggle-minimap");
    const esMovil = () => window.innerWidth <= 767;

    if (!minimapa || !toggleButton) {
        console.error("Error: Elementos del minimapa o botón no encontrados.");
        return;
    }

    function toggleMinimapa(mostrar){
        if (mostrar) {
            minimapa.classList.remove("oculto")
            toggleButton.innerHTML = '<i class="fa-solid fa-x"></i>'
        } else {
            minimapa.classList.add("oculto")
            toggleButton.innerHTML = '<i class="fa-solid fa-map-location-dot"></i>'
        }
    }

    if (esMovil()) {
        toggleMinimapa(true); 

        
        setTimeout(() => {
            toggleMinimapa(false);
        }, 900); // ¡CAMBIADO A 1000 ms!

        
        toggleButton.addEventListener("click", () => {
            const estaOculto = minimapa.classList.contains("oculto");
            toggleMinimapa(estaOculto);
        });

    } else {
        
        toggleButton.style.display = 'none';
        minimapa.classList.remove("oculto");
    }

    window.addEventListener('resize', () => {
        location.reload(); 
    });
});
