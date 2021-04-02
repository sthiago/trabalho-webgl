class Point {
    constructor(x, y) {
        console.assert(typeof(x) == "number", "x precisa ser um número");
        console.assert(typeof(x) == "number", "y precisa ser um número");

        this.x = x;
        this.y = y;
    }

    set_gl(gl) {
        console.assert(gl instanceof WebGL2RenderingContext, "objeto gl incorreto");
        this.gl = gl;
    }

    set_program(program) {
        console.assert(program instanceof WebGLProgram, "objeto program incorreto");
        this.program = program;
    }

    get_atributos() {
        this.a_position = this.gl.getAttribLocation(this.program, "a_position");
    }

    get_uniforms() {
        this.u_pointsize = this.gl.getUniformLocation(this.program, "u_pointsize");
        this.u_color = this.gl.getUniformLocation(this.program, "u_color");
    }

    set_uniforms(pointsize, color) {
        this.gl.uniform1f(this.u_pointsize, pointsize);
        this.gl.uniform4fv(this.u_color, new Float32Array(color));
    }

    init_buffer() {
        // Cria buffer e coloca o ponto lá
        this.buf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buf);

        const vec2 = new Float32Array([this.x, this.y]);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vec2, this.gl.STATIC_DRAW);
    }

    init_vao() {
        console.assert(this.a_position != null, "atributo a_position não foi setado");

        // Cria Vertex Array com informação de como extrair ponto do buffer
        this.vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(this.vao);

        this.gl.enableVertexAttribArray(this.a_position);
        this.gl.vertexAttribPointer(this.a_position, 2, this.gl.FLOAT, false, 0, 0);
    }

    init(gl, program) {
        this.set_gl(gl);
        this.set_program(program);
        this.get_atributos();
        this.get_uniforms();
        this.init_buffer();
        this.init_vao();
    }

    draw() {
        this.gl.useProgram(this.program);
        this.gl.bindVertexArray(this.vao);
        this.gl.drawArrays(this.gl.POINTS, 0, 1);
    }
}

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

function randrange(min, max) {
    return Math.random() * (max - min) + min;
}

function main()
{
    const gl = init_gl();
    if (!gl) return;

    // Compila programa a partir do código dos vertex e fragment shaders
    const program = initShaders(gl, "vs", "fs");

    // Cria 500 pontos aleatórios no primeiro quadrante
    const points = [];
    for (const _ of Array(5000)) {
        const p = new Point(randrange(-1, 1), randrange(-1, 1));
        p.init(gl, program);
        points.push(p);
    }

    // Desenha os os pontos em points
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    for (const p of points) {
        const pointsize = 1.5;
        const random_color = [Math.random(), Math.random(), Math.random(), 1];
        p.set_uniforms(1.5, random_color);
        p.draw();
    }
}

function test() {};

window.onload = main();
// window.onload = test();
