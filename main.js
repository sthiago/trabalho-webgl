// Inicializa gl, viewport e clearColor. Retorna gl
function init_gl()
{
    const canvas = document.querySelector("#canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) {
        alert("Sem suporte a WebGL 2.0");
        return;
    }

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);

    return gl;
}

function main()
{
    const gl = init_gl();
    if (!gl) return;

    // Compila programa a partir do código dos vertex e fragment shaders
    const program = initShaders(gl, "vs", "fs");

    // QUAIS SÃO OS ATRIBUTOS?
    const a_position = gl.getAttribLocation(program, "a_position");

    // QUAIS SÃO OS UNIFORMS?
    const u_pointsize = gl.getUniformLocation(program, "u_pointsize");

    // BUFFER STUFF
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    const points = [0, 0, 1, 1, 1, 0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);

    // VAO STUFF
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(a_position);
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

    // SETA O UNIFORM ANTES DE DRAWAR

    // DRAW?
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniform1f(u_pointsize, 5.0);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.POINTS, 0, 3);
}

window.onload = main();
