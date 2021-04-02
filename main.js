/**
 * Class base com funcionalidades relacionadas a inicialização WebGL.
 * As outras classes de objetos desenháveis devem herdar de BaseWebGLObject.
 */
class BaseWebGLObject {
    /**
     * Define o contexto gl para que o objeto consiga interagir: acessar atributos,
     * uniforms, criar buffers, se desenhar no canvas, etc.
     */
    set_gl(gl) {
        console.assert(gl instanceof WebGL2RenderingContext, "objeto gl incorreto");
        this.gl = gl;
    }

    /**
     * Define qual programa o objeto usa para ser renderizado. Também necessário para
     * acessar os atributos, uniforms, etc.
     */
    set_program(program) {
        console.assert(program instanceof WebGLProgram, "objeto program incorreto");
        this.program = program;
    }

    /**
     * Localiza os atributos necessários nos shaders.
     * Exemplo: this.a_pos = this.gl.getAttribLocation(this.program, "a_pos");
     * Este método deve ser sobrescrito nas subclasses.
     */
    get_atributos() {}

    /**
     * Localiza os uniforms necessários nos shaders.
     * Exemplo: this.u_color = this.gl.getUniformLocation(this.program, "u_color");
     * Este método deve ser sobrescrito nas subclasses.
     */
    get_uniforms() {}

    /**
     * Define os uniforms para este objeto. Este método deve ser chamado dentro do
     * método draw() utilizando o parâmetro f_extra.
     * Exemplo: this.gl.uniform4fv(this.u_color, new Float32Array(...));
     * Este método deve ser sobrescrito nas subclasses.
     */
    set_uniforms() {}

    /**
     * Cria um buffer para conter as coordenadas do objeto.
     * Este método deve ser sobrescrito nas subclasses e deve chamar super.init_buffer()
     */
    init_buffer() {
        const buf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buf);

        /* Chamar this.gl.bufferData(...) na subclasse */
    }

    /**
     * Cria um VAO para o objeto.
     * Este método deve ser sobrescrito nas subclasses e deve chamar super.init_vao()
     */
    init_vao() {
        // Cria Vertex Array Object e binda ele
        this.vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(this.vao);

        /**
         * Na subclasse, ativa cada atributo e "explica pro WebGL" como extrair
         * informação do buffer. Ou seja: chamar gl.enableVertexAttribArray(...) e
         * gl.vertexAttribPointer(...) para cada atributo.
         */
    }

    /**
     * Inicializa o objeto. Roda todas fases de inicialização necessárias. Este método
     * não deve ser rodado dentro do loop de renderização, mas sim na fase de iniciali-
     * zação da aplicação.
     */
    init(gl, program) {
        this.set_gl(gl);
        this.set_program(program);
        this.get_atributos();
        this.get_uniforms();
        this.init_buffer();
        this.init_vao();
    }

    /**
     * Desenha o objeto no canvas que contém o contexto gl configurado.
     * Configurações adicionar a serem feitas antes de desenhar mas depois da chamada
     * à gl.useProgram() também devem ser feitas aqui usando a função f_extra.
     * Este método deve ser sobrescrito nas subclasses para definir os parâmetros da
     * chamada ao gl.drawArrays().
     */
    draw(f_extra) {
        console.assert(typeof(f_extra) == "function");
        this.gl.useProgram(this.program);
        f_extra();
        this.gl.bindVertexArray(this.vao);

        /* Chamar gl.drawArrays(...) na subclasse com parâmetros corretos */
    }


}

/** Representa um ponto no espaço 2D */
class Point extends BaseWebGLObject {
    constructor(x, y) {
        super();

        console.assert(typeof(x) == "number", "x precisa ser um número");
        console.assert(typeof(y) == "number", "y precisa ser um número");

        this.x = x;
        this.y = y;
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
        super.init_buffer()
        const vec2 = new Float32Array([this.x, this.y]);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vec2, this.gl.STATIC_DRAW);
    }

    init_vao() {
        super.init_vao();

        // Como extrair valores do buffer de a_position
        console.assert(this.a_position != null, "atributo a_position não foi setado");
        this.gl.enableVertexAttribArray(this.a_position);
        this.gl.vertexAttribPointer(this.a_position, 2, this.gl.FLOAT, false, 0, 0);
    }

    draw(f_extra) {
        super.draw(f_extra);
        this.gl.drawArrays(this.gl.POINTS, 0, 1);
    }
}

/** Representa um segmento de reta no espaço 2D */
class Line extends BaseWebGLObject {
    constructor(x1, y1, x2, y2) {
        super();

        console.assert(typeof(x1) == "number", "x1 precisa ser um número");
        console.assert(typeof(y1) == "number", "y1 precisa ser um número");
        console.assert(typeof(x2) == "number", "x2 precisa ser um número");
        console.assert(typeof(y2) == "number", "y2 precisa ser um número");

        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }

    get_atributos() {
        this.a_position = this.gl.getAttribLocation(this.program, "a_position");
    }

    get_uniforms() {
        this.u_color = this.gl.getUniformLocation(this.program, "u_color");
    }

    set_uniforms(color) {
        this.gl.uniform4fv(this.u_color, new Float32Array(color));
    }

    init_buffer() {
        super.init_buffer();

        const coords = [this.x1, this.y1, this.x2, this.y2];
        const vec2 = new Float32Array(coords);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vec2, this.gl.STATIC_DRAW);
    }

    init_vao() {
        super.init_vao();

        // Como extrair valores do buffer de a_position
        console.assert(this.a_position != null, "atributo a_position não foi setado");
        this.gl.enableVertexAttribArray(this.a_position);
        this.gl.vertexAttribPointer(this.a_position, 2, this.gl.FLOAT, false, 0, 0);
    }

    draw(f_extra) {
        super.draw(f_extra);
        this.gl.drawArrays(this.gl.LINES, 0, 2);
    }
}


/**
 * Inicializa gl, viewport e clearColor.
 * Retorna o contexto gl.
 */
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

/** Função utilitária para gerar um número (float) entre min e max */
function randrange(min, max) {
    return Math.random() * (max - min) + min;
}

/** Ponto de entrada da aplicação */
function main()
{
    // Cria e configura gl
    const gl = init_gl();
    if (!gl) return;

    // Compila programa a partir do código dos vertex e fragment shaders
    const program = initShaders(gl, "vs", "fs");

    // Cria pontos aleatórios
    const points = [];
    for (const _ of Array(50)) {
        const p = new Point(randrange(-1, 1), randrange(-1, 1));
        p.init(gl, program);
        points.push(p);
    }

    // Cria retas aleatórias
    const lines = [];
    for (const _ of Array(10)) {
        const l = new Line(
            randrange(-1, 1), randrange(-1, 1), randrange(-1, 1), randrange(-1, 1)
        );
        l.init(gl, program);
        lines.push(l);
    }

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Desenha todos os pontos em points
    for (const p of points) {
        p.draw(() => {
            const pointsize = 3;
            const random_color = [Math.random(), Math.random(), Math.random(), 1];
            p.set_uniforms(pointsize, random_color);
        });
    }

    // Desenha todas as restas em lines
    for (const l of lines) {
        l.draw(() => {
            const random_color = [Math.random(), Math.random(), Math.random(), 1];
            l.set_uniforms(random_color);
        });
    }

}

function test() {};

window.onload = main();
// window.onload = test();
