// Archivo: js/script.js

// Variables globales para almacenar los datos base (sin ajustes)
let globalBaseAnualFinal = 0;
let globalBaseDiarioFinal = 0;
let globalCurrentTipo = "";
let globalCurrentUnidad = "";
let globalCurrentPeriodo = ""; // almacena el período actual (anual, calido, frio)

// Rutas de los archivos CSV
const csvUrls = {
  electrico: 'data/luz.csv',
  agua: 'data/agua.csv',
  consumibles: 'data/consum.csv',
  limpieza: 'data/limpieza.csv'
};

// Objeto con recomendaciones personalizadas para cada tipo y período, más recomendaciones generales
const fullRecomendaciones = {
  electrico: {
    general: [
      "Utiliza bombillas LED de bajo consumo.",
      "Desenchufa cargadores cuando no estén en uso.",
      "Aprovecha la luz natural abriendo cortinas y persianas."
    ],
    anual: [
      "Instala termostatos inteligentes y revisa el aislamiento de puertas y ventanas."
    ],
    calido: [
      "Usa ventiladores de techo en lugar de aire acondicionado.",
      "Ventila durante las horas frescas de la mañana y la noche."
    ],
    frio: [
      "Optimiza el uso de la calefacción con termostatos programables.",
      "Sella rendijas y ventanas para evitar pérdidas de calor."
    ]
  },
  agua: {
    general: [
      "Repara fugas inmediatamente.",
      "Instala reductores de caudal y cierra el grifo cuando no se use."
    ],
    anual: [
      "Utiliza la lavadora y el lavavajillas a carga completa durante todo el año."
    ],
    calido: [
      "Riega las plantas al atardecer para minimizar la evaporación.",
      "Recoge el agua fría de la ducha para reutilizarla en otras tareas."
    ],
    frio: [
      "Protege las tuberías y revisa las conexiones para evitar congelamientos."
    ]
  },
  consumibles: {
    general: [
      "Digitaliza documentos y utiliza impresión a doble cara.",
      "Utiliza utensilios y recipientes reutilizables."
    ],
    anual: [
      "Compra consumibles al por mayor para reducir costos y empaques."
    ],
    calido: [
      "Almacena consumibles en lugares frescos y secos para evitar el deterioro."
    ],
    frio: [
      "Protege el material de oficina de la humedad y bajas temperaturas."
    ]
  },
  limpieza: {
    general: [
      "Utiliza productos concentrados y biodegradables.",
      "Emplea paños de microfibra reutilizables en lugar de papel desechable."
    ],
    anual: [
      "Selecciona proveedores con certificaciones ecológicas durante todo el año."
    ],
    calido: [
      "Ventila bien las áreas mientras limpias para acelerar el secado y evitar moho."
    ],
    frio: [
      "Limpia entradas y suelos para eliminar barro o nieve, y seca bien las superficies."
    ]
  }
};

// Objeto con estimación de ahorro potencial (%), según el tipo de consumo y la época
const ahorroEstimado = {
  electrico: { anual: 10, calido: 12, frio: 15 },
  agua: { anual: 8, calido: 10, frio: 12 },
  consumibles: { anual: 5, calido: 7, frio: 9 },
  limpieza: { anual: 7, calido: 8, frio: 10 }
};

document.addEventListener('DOMContentLoaded', () => {
  // Listeners para cambios en el tipo de consumo y el período
  document.getElementById('tipoConsumo').addEventListener('change', iniciarCalculos);
  document.querySelectorAll('input[name="periodo"]').forEach(radio => {
    radio.addEventListener('change', iniciarCalculos);
  });
  
  // Listeners para ajustes de consumo
  document.getElementById('inputPorcentajeAumentar').addEventListener('input', recalcAuto);
  document.getElementById('inputPorcentajeReducir').addEventListener('input', recalcAuto);
  
  // Cálculo automático al cargar la página
  iniciarCalculos();
  
  // Listener para el botón de recomendaciones
  document.getElementById('btnRecomendaciones').addEventListener('click', toggleRecomendaciones);
});

function iniciarCalculos() {
  // Guardamos el período actual seleccionado
  globalCurrentPeriodo = document.querySelector('input[name="periodo"]:checked').value;
  
  const tipoConsumo = document.getElementById('tipoConsumo').value;
  const csvUrl = csvUrls[tipoConsumo];
  if (!csvUrl) {
    alert("No se encontró el archivo CSV para el tipo de consumo seleccionado.");
    return;
  }
  leerCSV(csvUrl)
    .then(data => {
      switch (tipoConsumo) {
        case 'electrico':
          calcularConsumo(data, 'electrico', ["Consumo (kWh)", "kWh"]);
          break;
        case 'agua':
          calcularConsumo(data, 'agua', ["value", "litros"]);
          break;
        case 'consumibles':
          calcularConsumoConsumibles(data);
          break;
        case 'limpieza':
          calcularConsumo(data, 'limpieza', ["Total", "€"]);
          break;
      }
      // Actualiza la sección de recomendaciones si está visible
      updateRecomendacionesIfVisible();
    })
    .catch(error => {
      console.error("Error al cargar el CSV:", error);
      alert("Hubo un problema al leer los datos.");
    });
}

function leerCSV(url) {
  return fetch(url)
    .then(response => {
      if (!response.ok) throw new Error(`Error al cargar ${url}`);
      return response.text();
    })
    .then(csvText =>
      new Promise((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: results => resolve(results.data),
          error: err => reject(err)
        });
      })
    );
}

const factoresEstacionales = {
  anual: 1,
  calido: { 
    electrico: 0.9 * (120 / 365),
    agua: 1.2 * (120 / 365),
    consumibles: 1.15 * (120 / 365),
    limpieza: 1.1 * (120 / 365)
  },
  frio: {
    electrico: 1.2 * (245 / 365),
    agua: 0.9 * (245 / 365),
    consumibles: 1.05 * (245 / 365),
    limpieza: 1.1 * (245 / 365)
  }
};

function aplicarFactorEstacional(consumoTotal, tipo) {
  const periodo = document.querySelector('input[name="periodo"]:checked').value;
  return consumoTotal * (factoresEstacionales[periodo]?.[tipo] || 1);
}

// Función para calcular el consumo (anual y promedio diario)
function calcularConsumo(data, tipo, [columna, unidad]) {
  let consumoTotal = data.reduce((sum, row) => sum + (parseFloat(row[columna]) || 0), 0);
  let dias;
  if (tipo === 'electrico') {
    dias = data.length;
  } else if (tipo === 'agua') {
    const diasUnicos = [...new Set(data.map(row => row.Día))];
    dias = diasUnicos.length;
  } else {
    dias = 1;
  }
  const consumoAnualOriginal = (consumoTotal / dias) * 365;
  let consumoAnualFinal = aplicarFactorEstacional(consumoAnualOriginal, tipo);
  
  const periodo = document.querySelector('input[name="periodo"]:checked').value;
  let diasPeriodo = (periodo === 'calido') ? 120 : (periodo === 'frio') ? 245 : 365;
  const promedioDiarioFinal = consumoAnualFinal / diasPeriodo;
  
  // Guardamos los valores base para aplicar ajustes
  globalBaseAnualFinal = consumoAnualFinal;
  globalBaseDiarioFinal = promedioDiarioFinal;
  globalCurrentTipo = tipo;
  globalCurrentUnidad = unidad;
  
  actualizarResultados(tipo, consumoAnualFinal, promedioDiarioFinal, unidad);
  graficarConsumo(tipo, consumoAnualFinal, promedioDiarioFinal, unidad);
}

// Función para calcular el consumo en consumibles (no se requiere promedio diario)
function calcularConsumoConsumibles(data) {
  let totalPrecio = 0;
  data.forEach(row => {
    let claves = Object.keys(row).map(k => k.trim().toLowerCase());
    let indexPrecio = claves.findIndex(k => k.includes("precio") || k.includes("costo"));
    if (indexPrecio !== -1) {
      let precioString = row[Object.keys(row)[indexPrecio]]
        .toString()
        .replace(/"/g, '')
        .replace(/,/g, '.');
      let precioTotal = parseFloat(precioString);
      if (!isNaN(precioTotal)) {
        totalPrecio += precioTotal;
      }
    }
  });
  const consumoAnualOriginal = totalPrecio;
  let consumoFinal = aplicarFactorEstacional(consumoAnualOriginal, 'consumibles');
  
  // Para consumibles, anual y diario son iguales
  globalBaseAnualFinal = consumoFinal;
  globalBaseDiarioFinal = consumoFinal;
  globalCurrentTipo = 'consumibles';
  globalCurrentUnidad = '€';
  
  actualizarResultados('consumibles', consumoFinal, consumoFinal, '€');
  graficarConsumo('consumibles', consumoFinal, consumoFinal, '€');
}

// Función para actualizar los resultados en pantalla y el gráfico
function actualizarResultados(tipo, consumoFinal, promedioDiarioFinal, unidad) {
  const unidades = { electrico: "kWh", agua: "L", consumibles: "€", limpieza: "€" };
  let mensaje = "";
  if (tipo === "electrico" || tipo === "agua") {
    mensaje = `Consumo anual: ${consumoFinal.toFixed(2)} ${unidades[tipo]}<br>
               Promedio diario: ${promedioDiarioFinal.toFixed(2)} ${unidades[tipo]}`;
  } else {
    mensaje = `Gasto anual: ${consumoFinal.toFixed(2)} ${unidades[tipo]}`;
  }
  const textoIndicador = {
    electrico: consumoFinal > 1000 ? "Optimiza el uso de calefacción e iluminación." : "Consumo eléctrico en buen rango.",
    agua: consumoFinal > 500 ? "Usa dispositivos de ahorro y revisa fugas." : "Consumo de agua adecuado.",
    consumibles: consumoFinal > 20000 ? "Controla el uso de material de oficina." : "Consumo de consumibles razonable.",
    limpieza: consumoFinal > 1000 ? "Revisa la frecuencia de limpieza." : "Gasto en limpieza controlado."
  };
  document.getElementById("resultadoTexto").innerHTML = `<h3>${mensaje}</h3><p>${textoIndicador[tipo]}</p>`;
}

// Función para graficar los resultados usando Chart.js
function graficarConsumo(tipo, consumoAnual, promedioDiario, unidad) {
  const ctx = document.getElementById("graficoConsumo").getContext("2d");
  if (window.consumoChart) window.consumoChart.destroy();
  const tipoNorm = tipo.trim().toLowerCase();
  let labels, data, backgroundColor, borderColor;
  if (tipoNorm === "limpieza" || tipoNorm === "consumibles") {
    labels = ["Anual"];
    data = [consumoAnual];
    backgroundColor = ["rgba(255, 159, 64, 0.6)"];
    borderColor = ["rgba(255, 159, 64, 1)"];
  } else {
    labels = ["Anual", "Diario"];
    data = [consumoAnual, promedioDiario];
    backgroundColor = [
      "rgba(255, 159, 64, 0.6)",
      "rgba(153, 102, 255, 0.6)"
    ];
    borderColor = [
      "rgba(255, 159, 64, 1)",
      "rgba(153, 102, 255, 1)"
    ];
  }
  
  window.consumoChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: `Consumo (${unidad})`,
        data: data,
        backgroundColor: backgroundColor,
        borderColor: borderColor,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: `Consumo (${unidad})`
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.label}: ${context.parsed.y.toFixed(2)} ${unidad}`;
            }
          }
        }
      }
    }
  });
}

// Función que se ejecuta al modificar los ajustes de consumo
function recalcAuto() {
  if (globalBaseAnualFinal === 0) return;
  
  let aumentar = parseFloat(document.getElementById('inputPorcentajeAumentar').value) || 0;
  let reducir = parseFloat(document.getElementById('inputPorcentajeReducir').value) || 0;
  let neto = aumentar - reducir;
  const newConsumoAnual = globalBaseAnualFinal * (1 + neto / 100);
  const newPromedioDiario = globalBaseDiarioFinal * (1 + neto / 100);
  
  actualizarResultados(globalCurrentTipo, newConsumoAnual, newPromedioDiario, globalCurrentUnidad);
  graficarConsumo(globalCurrentTipo, newConsumoAnual, newPromedioDiario, globalCurrentUnidad);
  
  // Actualiza las recomendaciones si se muestran
  updateRecomendacionesIfVisible();
}

// Si la sección de recomendaciones está visible, se actualiza dinámicamente
function updateRecomendacionesIfVisible() {
  const recDiv = document.getElementById('recomendaciones');
  if (!recDiv.classList.contains('hidden')) {
    recDiv.innerHTML = generarListaRecomendaciones(globalCurrentTipo, globalCurrentPeriodo);
  }
}

// Muestra u oculta la sección de recomendaciones
function toggleRecomendaciones() {
  const recDiv = document.getElementById('recomendaciones');
  const btnRec = document.getElementById('btnRecomendaciones');
  
  if (recDiv.classList.contains('hidden')) {
    recDiv.classList.remove('hidden');
    recDiv.innerHTML = generarListaRecomendaciones(globalCurrentTipo, globalCurrentPeriodo);
    btnRec.textContent = 'Ocultar Recomendaciones';
  } else {
    recDiv.classList.add('hidden');
    btnRec.textContent = 'Ver Recomendaciones';
  }
}

// Genera la lista dinámica de recomendaciones combinando las generales y las exclusivas según la época,
// y añade la estimación de ahorro potencial.
function generarListaRecomendaciones(tipo, periodo) {
  if (!fullRecomendaciones[tipo]) {
    return `
      <h3>Recomendaciones para reducir el consumo/gasto</h3>
      <p>No hay recomendaciones específicas para este tipo de consumo.</p>
    `;
  }
  
  const recGeneral = fullRecomendaciones[tipo].general || [];
  const recPeriodo = fullRecomendaciones[tipo][periodo] || [];
  const recTotal = [...recGeneral, ...recPeriodo];
  
  let html = `<h3>Recomendaciones para reducir el consumo/gasto</h3>`;
  if (recTotal.length === 0) {
    html += `<p>No hay recomendaciones disponibles para este período.</p>`;
  } else {
    const items = recTotal.map(reco => `<li>${reco}</li>`).join('');
    html += `<ul>${items}</ul>`;
  }
  
  // Obtener y mostrar la estimación de ahorro potencial
  const ahorroPorcentaje = (ahorroEstimado[tipo] && ahorroEstimado[tipo][periodo]) ? ahorroEstimado[tipo][periodo] : 0;
  html += `<p><strong>Estimación de ahorro potencial:</strong> Siguiendo estas recomendaciones, podrías reducir tu consumo/gasto en aproximadamente un ${ahorroPorcentaje}%.</p>`;
  
  return html;
}

