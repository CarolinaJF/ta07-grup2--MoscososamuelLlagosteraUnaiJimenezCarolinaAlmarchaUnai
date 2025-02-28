async function cargarCSV(url) {
    const response = await fetch(url);
    const data = await response.text();

    // Convertir CSV en un array de objetos
    const filas = data.split("\n").map(fila => fila.split(","));
    const encabezados = filas[0].map(e => e.trim());
    const registros = filas.slice(1).map(fila => {
        let objeto = {};
        fila.forEach((valor, i) => {
            objeto[encabezados[i]] = isNaN(valor.trim()) ? valor.trim() : parseFloat(valor.trim());
        });
        return objeto;
    });

    return registros;
}

// Función para mostrar los datos en una tabla HTML
function mostrarDatosEnTabla(datos) {
    const tablaEncabezados = document.getElementById("encabezados");
    const tablaCuerpo = document.getElementById("cuerpoTabla");

    // Limpiar contenido anterior
    tablaEncabezados.innerHTML = "";
    tablaCuerpo.innerHTML = "";

    if (datos.length === 0) return;

    // Crear encabezados
    Object.keys(datos[0]).forEach(encabezado => {
        let th = document.createElement("th");
        th.innerText = encabezado;
        tablaEncabezados.appendChild(th);
    });

    // Crear filas de datos
    datos.forEach(registro => {
        let fila = document.createElement("tr");
        Object.values(registro).forEach(valor => {
            let td = document.createElement("td");
            td.innerText = valor;
            fila.appendChild(td);
        });
        tablaCuerpo.appendChild(fila);
    });
}

// Cargar datos y mostrarlos en la tabla
cargarCSV("datos.csv").then(datos => {
    mostrarDatosEnTabla(datos);
});


// Función para obtener el mensaje según el tipo
function obtenerMensaje(tipo) {
    switch (tipo) {
        case "electricidad":
            return `🔋 Consejos para reducir el consumo eléctrico:
- Usa bombillas LED en lugar de incandescentes.
- Apaga los dispositivos cuando no los uses.
- Desenchufa cargadores y equipos en modo standby.
- Ajusta la calefacción y el aire acondicionado a temperaturas eficientes.`;
        case "agua":
            return `🚰 Consejos para ahorrar agua:
- Repara fugas en grifos y tuberías.
- Usa reductores de caudal en grifos y duchas.
- No dejes el agua corriendo mientras te cepillas los dientes.
- Riega el jardín en horas de menor calor para evitar evaporación.`;
        case "consumibles":
            return `📄 Consejos para reducir el consumo de consumibles:
- Imprime solo cuando sea necesario y en doble cara.
- Usa papel reciclado y reutiliza hojas cuando sea posible.
- Compra en grandes cantidades para reducir envases y costos.
- Fomenta el uso de materiales digitales en lugar de papel.`;
        case "limpieza":
            return `🧼 Consejos para reducir costos de limpieza:
- Usa productos de limpieza concentrados y diluidos correctamente.
- Implementa un calendario de limpieza eficiente para evitar desperdicio de productos.
- Utiliza paños reutilizables en lugar de papel desechable.
- Compra productos de limpieza ecológicos y a granel.`;
    }
}

// Crear botones para mostrar/ocultar recomendaciones
const categorias = ["electricidad", "agua", "consumibles", "limpieza"];

categorias.forEach(tipo => {
    const boton = document.createElement("button");
    boton.innerText = `Mostrar/Ocultar ${tipo}`;
    boton.onclick = () => toggleRecomendaciones(tipo);
    document.body.appendChild(boton);
    document.body.appendChild(document.createElement("br"));
});
