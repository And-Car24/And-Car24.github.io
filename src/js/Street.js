/** * CONFIGURACIÓN Y CONSTANTES 
 */
const CONFIG = {
  numPanoramas: 6,
  imgPath: "/public/panoramas/",
  arrowImg: "/public/img/flecha.png",
  dialogosUrl: "/public/data/dialogos.json",
  linksUrl: "/public/data/links.json",
  radarOffset: { 1: 0, 2: 0, 3: -90, 4: 0, 5: -90, 6: 90 },
};

/** * INICIALIZACIÓN DEL VISOR 
 */
const container = document.querySelector("#container");
const viewer = new PANOLENS.Viewer({
  container,
  output: "console",
  autoRotate: false,
  controlBar: false,
  autoHideInfospot: false,
  clickIntoView: false,
});

// Setup de CSS2DRenderer para etiquetas HTML
const labelRenderer = new THREE.CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = "absolute";
labelRenderer.domElement.style.top = "0";
labelRenderer.domElement.style.pointerEvents = "none";
container.appendChild(labelRenderer.domElement);

// Creación de Panoramas
const panoramica = Array.from({ length: CONFIG.numPanoramas + 1 }, (_, i) =>
  i > 0 ? new PANOLENS.ImagePanorama(`${CONFIG.imgPath}recorrido${i}.avif`) : null
);

panoramica.forEach((pano, i) => {
  if (pano) {
    viewer.add(pano);
    pano.addEventListener("enter", () => activarPunto(i));
  }
});

/** * FUNCIONES DE NAVEGACIÓN Y TRANSICIÓN 
 */
function zoomTransition(panoramaDestino) {
  const viewerContainer = viewer.getContainer();
  const minimapa = document.querySelector(".minimapa");
  if (minimapa) minimapa.style.opacity = "0";

  const state = { scale: 1.0, blur: 0, opacity: 1 };

  // FASE 1: "Salto" adelante
  new TWEEN.Tween(state)
    .to({ scale: 2.0, blur: 25, opacity: 0 }, 400)
    .easing(TWEEN.Easing.Cubic.In)
    .onUpdate(() => {
      viewerContainer.style.transform = `scale(${state.scale})`;
      viewerContainer.style.filter = `blur(${state.blur}px)`;
      viewerContainer.style.opacity = state.opacity;
    })
    .onComplete(() => {
      viewer.setPanorama(panoramaDestino);
      
      // FASE 2: "Aterrizaje"
      state.scale = 1.3; state.blur = 30; state.opacity = 0;
      new TWEEN.Tween(state)
        .to({ scale: 1.0, blur: 0, opacity: 1 }, 200)
        .easing(TWEEN.Easing.Cubic.Out)
        .onUpdate(() => {
          viewerContainer.style.transform = `scale(${state.scale})`;
          viewerContainer.style.filter = `blur(${state.blur}px)`;
          viewerContainer.style.opacity = state.opacity;
        })
        .onComplete(() => {
          viewerContainer.style.transform = "none";
          viewerContainer.style.filter = "none";
          if (minimapa) minimapa.style.opacity = "1";
        })
        .start();
    })
    .start();
}

function addCustomLink(from, to, vec) {
  const hotspot = new PANOLENS.Infospot(800, CONFIG.arrowImg);
  hotspot.position.set(...vec);
  hotspot.userData.tipo = "flecha";
  hotspot.addEventListener("click", () => zoomTransition(panoramica[to]));
  panoramica[from].add(hotspot);
}

// CARGA DINÁMICA DE LINKS (FLECHAS)
fetch(CONFIG.linksUrl)
  .then(res => {
    if (!res.ok) throw new Error("No se pudo cargar links.json");
    return res.json();
  })
  .then(data => {
    data.forEach(([from, to, vec]) => {
      // Verificamos que el panorama de origen exista antes de añadir la flecha
      if (panoramica[from]) {
        addCustomLink(from, to, vec);
      }
    });
    console.log("Links cargados correctamente");
  })
  .catch(err => console.error("Error cargando links:", err));

/** * LÓGICA DEL MINIMAPA Y RADAR 
 */
function activarPunto(num) {
  document.querySelectorAll(".punto").forEach(p => p.classList.remove("activo"));
  const punto = document.getElementById(`p-pan${num}`);
  if (!punto) return;

  punto.classList.add("activo");
  const radar = document.getElementById("radar");
  const minimapaRect = document.querySelector(".minimapa").getBoundingClientRect();
  const puntoRect = punto.getBoundingClientRect();

  radar.style.display = "block";
  radar.dataset.active = num;
  
  // Centrado dinámico (basado en 30px de tamaño de radar)
  radar.style.left = `${(puntoRect.left - minimapaRect.left) + (puntoRect.width / 2) - 15}px`;
  radar.style.top = `${(puntoRect.top - minimapaRect.top) + (puntoRect.height / 2) - 15}px`;
}

function actualizarRadar() {
  const radar = document.getElementById("radar");
  if (!radar || radar.style.display === "none") return;

  const active = Number(radar.dataset.active || 1);
  const angle = viewer.getControl().getAzimuthalAngle();
  const degrees = -THREE.Math.radToDeg(angle);

  radar.style.transform = `rotate(${degrees + (CONFIG.radarOffset[active] || 0) + 180}deg)`;
}

viewer.addUpdateCallback(actualizarRadar);

/** * INFOSPOTS Y DIÁLOGOS 
 */
function crearDialogoIncrustado(panorama, data) {
  const hotspot = new PANOLENS.Infospot(300, PANOLENS.DataImage.Info);
  hotspot.position.set(...data.position);
  hotspot.userData.tipo = "info";

  const materialOnda = new THREE.SpriteMaterial({
    map: new THREE.TextureLoader().load(PANOLENS.DataImage.Info),
    transparent: true,
    opacity: 0,
    depthTest: false,
  });

  const onda = new THREE.Sprite(materialOnda);
  onda.visible = false;
  hotspot.add(onda);
  hotspot.onda = onda;

  // Manejo de visibilidad de onda
  panorama.addEventListener("enter-fade-start", () => onda.visible = true);
  panorama.addEventListener("leave-fade-start", () => {
    onda.visible = false;
    onda.material.opacity = 0;
  });

  const div = document.createElement("div");
  div.className = "dialogo-anclado";
  div.innerHTML = `
    <strong style="display:block; font-size:16px;">${data.titulo}</strong>
    <img src="${data.imagen}">
    <p style="font-size: 14px; line-height: 1.4; margin:0;">${data.texto}</p>
  `;

  const stop = (e) => e.stopPropagation();
  ["touchstart", "touchmove", "wheel"].forEach(ev => div.addEventListener(ev, stop));

  hotspot.element = div;
  hotspot.addEventListener("click", (e) => {
    if (e.domEvent) e.domEvent.stopPropagation();
    cerrarDialogos();
    div.classList.add("activo");
  });

  panorama.add(hotspot);
}

const cerrarDialogos = () => {
  document.querySelectorAll(".dialogo-anclado").forEach(d => d.classList.remove("activo"));
};

/** * EVENTOS DE SISTEMA Y CARGA 
 */
function animate() {
  if (typeof TWEEN !== "undefined") TWEEN.update();
  const ahora = Date.now();

  panoramica.forEach(pano => {
    if (pano?.visible && pano.children) {
      pano.children.forEach(child => {
        if (child instanceof PANOLENS.Infospot) {
          // Animación Flechas
          if (child.userData.tipo === "flecha") {
            child.position.y += Math.sin(ahora * 0.005) * 1.5;
          }
          // Animación Ondas
          if (child.onda?.visible) {
            const progreso = (ahora % 2000) / 2000;
            const escala = 1 + (progreso * 1.5);
            child.onda.scale.set(escala, escala, 1);
            child.onda.material.opacity = 0.5 * (1 - progreso);
          }
        }
      });
    }
  });
  requestAnimationFrame(animate);
}

// Cierre global de diálogos
viewer.getContainer().addEventListener("click", cerrarDialogos);
viewer.getControl().addEventListener("start", cerrarDialogos);

// Setup de puntos del minimapa
for (let i = 1; i <= CONFIG.numPanoramas; i++) {
  const punto = document.getElementById(`p-pan${i}`);
  if (punto) {
    ["click", "touchstart"].forEach(ev => 
      punto.addEventListener(ev, () => zoomTransition(panoramica[i]))
    );
  }
}

// Lógica de Toggle Minimapa y Resize
document.addEventListener("DOMContentLoaded", () => {
  const minimapa = document.querySelector(".minimapa");
  const toggleBtn = document.getElementById("toggle-minimap");
  if (!minimapa || !toggleBtn) return;

  const toggleMinimapa = (mostrar) => {
    minimapa.classList.toggle("oculto", !mostrar);
    toggleBtn.innerHTML = mostrar ? '<i class="fa-solid fa-x"></i>' : '<i class="fa-solid fa-map-location-dot"></i>';
  };

  if (window.innerWidth <= 767) {
    toggleMinimapa(true);
    setTimeout(() => toggleMinimapa(false), 1000);
    toggleBtn.addEventListener("click", () => toggleMinimapa(minimapa.classList.contains("oculto")));
  } else {
    toggleBtn.style.display = "none";
    minimapa.classList.remove("oculto");
  }
});

window.addEventListener("resize", () => location.reload());

// Carga de datos externos
fetch(CONFIG.dialogosUrl)
  .then(res => res.json())
  .then(data => {
    data.forEach(d => {
      if (panoramica[d.panorama]) crearDialogoIncrustado(panoramica[d.panorama], d);
    });
  })
  .catch(err => console.error("Error cargando diálogos:", err));

// Inicio
animate();
activarPunto(1);
viewer.setPanorama(panoramica[1]);
