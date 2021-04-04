/**
 * Classe Base com funcionalidades relacionadas a inicialização WebGL.
 * Cada primitiva desenhável deve ser uma classe que herda de Base.
 */
class Base {
    /**
     * Lista que contém todos os objetos dessa classe. Guardando eles numa lista, eu
     * posso fazer apenas uma chamada a gl.drawArrays() para todos da mesma primitiva,
     * em vez de ter que fazer uma chamada para cada objeto.
     * Cada subclasse tem de inicializar sua lista
     */
    static list;

    /**
     * Define o contexto gl para que a classe consiga fazer chamadas à WebGL: acessar
     * atributos, uniforms, criar buffers, desenhar no canvas, etc.
     */
    static set_gl(gl) {
        console.assert(gl instanceof WebGL2RenderingContext, "objeto gl incorreto");
        this.gl = gl;
    }

    /**
     * Define qual programa a classe usa para renderizar seus objetos. Também necessário
     * para algumas chamadas WebGL. Cada classe pode usar um programa diferente, apesar
     * de não ser o caso nessa aplicação.
     */
    static set_program(program) {
        console.assert(program instanceof WebGLProgram, "objeto program incorreto");
        this.program = program;
    }

    /**
     * Localiza os atributos/uniforms necessários nos shaders.
     * Exemplo: cls.a_pos = cls.gl.getAttribLocation(cls.program, "a_pos");
     * Exemplo: cls.u_res = cls.gl.getUniformLocation(cls.program, "u_res");
     * Cada subclasse deve implementar esses método localizando as variáveis que usa.
     */
    static get_atributos() {}
    static get_uniforms() {}

    /**
     * Define os uniforms para esta classe. Esses valores são globais para todos os
     * objetos instanciados. Se algum uniform precisar ser setado com valores diferentes
     * a cada chamada de desenho, devem ser setados no param. f_extra do método .draw()
     * Exemplo: cls.gl.uniform4fv(cls.u_color, new Float32Array(...));
     * Este método deve ser sobrescrito nas subclasses.
     */
    static set_uniforms() {}

    /**
     * Cria Vertex Array Object (VAO) para a classe. As subclasses devem também criar e
     * inicializar os buffers de cada atributo que utilizam.
     * Este método deve ser sobrescrito nas subclasses.
     */
    static init_vao_e_buffers() {
        this.vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(this.vao);

        /* createBuffer, bindBuffer, enableVAO, etc. pra cada atributo */
    }

    /**
     * Inicializa a classe. Toda subclasse deve chamar este método durante a fase de
     * inicialização da aplicação.
     */
    static init(gl, program) {
        this.set_gl(gl);
        this.set_program(program);
        this.get_atributos();
        this.get_uniforms();
        this.init_vao_e_buffers();
    }

    /**
     * Desenha todos as instâncias desta classe.
     * As subclasses devem sobrescrever este método.
     */
    static draw(f_extra) {
        if (f_extra != undefined) console.assert(typeof(f_extra) == "function");

        this.gl.useProgram(this.program);
        this.gl.bindVertexArray(this.vao);
        this.set_uniforms();
        if (f_extra != undefined) f_extra();

        /* bindBuffer, bufferData, drawArrays, etc */
    }

    /* As subclasses devem implementar pelo menos os seguintes métodos não estáticos */
    constructor() {}
    delete() {}

    /**
     * As subclasses devem implementar métodos para setar os valores de cada objeto.
     * Não necessariamente apenas um método set_value().
     */
    set_value() {}
}

class Point extends Base {
    static list = [];

    static get_atributos() {
        this.a_position = this.gl.getAttribLocation(this.program, "a_position");
        this.a_color = this.gl.getAttribLocation(this.program, "a_color");
    }

    static get_uniforms() {
        this.u_pointsize = this.gl.getUniformLocation(this.program, "u_pointsize");
        this.u_resolution = this.gl.getUniformLocation(this.program, "u_resolution");
    }

    static set_uniforms() {
        this.gl.uniform2f(
            this.u_resolution, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.uniform1f(this.u_pointsize, 3);
    }

    static init_vao_e_buffers() {
        super.init_vao_e_buffers();

        // a_position
        console.assert(this.a_position != null, "atributo a_position não foi setado");
        this.a_position_buf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.a_position_buf);
        this.gl.enableVertexAttribArray(this.a_position);
        this.gl.vertexAttribPointer(this.a_position, 2, this.gl.FLOAT, false, 0, 0);

        // a_color
        console.assert(this.a_color != null, "atributo a_color não foi setado");
        this.a_color_buf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.a_color_buf);
        this.gl.enableVertexAttribArray(this.a_color);
        this.gl.vertexAttribPointer(this.a_color, 4, this.gl.UNSIGNED_BYTE, true, 0, 0);
    }

    static draw(f_extra) {
        super.draw(f_extra);

        // a_position
        const position_data = Array(2 * this.list.length);
        for (let i = 0; i < this.list.length; i++) {
            const p = this.list[i];
            position_data[i*2+0] = p.x;
            position_data[i*2+1] = p.y;
        }
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.a_position_buf);
        this.gl.bufferData(
            this.gl.ARRAY_BUFFER, new Float32Array(position_data), this.gl.STATIC_DRAW);

        // a_color
        const color_data = Array(4 * this.list.length);
        for (let i = 0; i < this.list.length; i++) {
            const p = this.list[i];
            color_data[i*4+0] = p.color[0];
            color_data[i*4+1] = p.color[1];
            color_data[i*4+2] = p.color[2];
            color_data[i*4+3] = p.color[3];
        }
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.a_color_buf);
        this.gl.bufferData(
            this.gl.ARRAY_BUFFER, new Uint8Array(color_data), this.gl.STATIC_DRAW);

        this.gl.drawArrays(this.gl.POINTS, 0, this.list.length);
    }

    constructor(x, y) {
        super();

        this.x = x;
        this.y = y;

        // Cor padrão = preto
        this.color = [0, 0, 0, 255];

        this.constructor.list.push(this);
    }

    delete() {
        const index = this.constructor.list.indexOf(this);
        this.constructor.list.splice(index, 1);
    }

    set_position(x, y) {
        this.x = x;
        this.y = y;
    }

    set_color(r, g, b, a) {
        this.color = [r, g, b, a];
    }
}

class Line extends Base {
    static list = [];

    static get_atributos() {
        this.a_position = this.gl.getAttribLocation(this.program, "a_position");
        this.a_color = this.gl.getAttribLocation(this.program, "a_color");
    }

    static get_uniforms() {
        this.u_resolution = this.gl.getUniformLocation(this.program, "u_resolution");
    }

    static set_uniforms() {
        this.gl.uniform2f(
            this.u_resolution, this.gl.canvas.width, this.gl.canvas.height);
    }

    static init_vao_e_buffers() {
        super.init_vao_e_buffers();

        // a_position
        console.assert(this.a_position != null, "atributo a_position não foi setado");
        this.a_position_buf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.a_position_buf);
        this.gl.enableVertexAttribArray(this.a_position);
        this.gl.vertexAttribPointer(this.a_position, 2, this.gl.FLOAT, false, 0, 0);

        // a_color
        console.assert(this.a_color != null, "atributo a_color não foi setado");
        this.a_color_buf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.a_color_buf);
        this.gl.enableVertexAttribArray(this.a_color);
        this.gl.vertexAttribPointer(this.a_color, 4, this.gl.UNSIGNED_BYTE, true, 0, 0);
    }

    static draw(f_extra) {
        super.draw(f_extra);

        // a_position
        const position_data = Array(2 * 2 * this.list.length);
        for (let i = 0; i < this.list.length; i++) {
            const l = this.list[i];
            position_data[i*4+0] = l.x1;
            position_data[i*4+1] = l.y1;
            position_data[i*4+2] = l.x2;
            position_data[i*4+3] = l.y2;
        }
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.a_position_buf);
        this.gl.bufferData(
            this.gl.ARRAY_BUFFER, new Float32Array(position_data), this.gl.STATIC_DRAW);

        // a_color
        const color_data = Array(2 * 4 * this.list.length);
        for (let i = 0; i < this.list.length; i++) {
            const p = this.list[i];
            color_data[i*8+0] = p.color[0];
            color_data[i*8+1] = p.color[1];
            color_data[i*8+2] = p.color[2];
            color_data[i*8+3] = p.color[3];
            color_data[i*8+4] = p.color[0];
            color_data[i*8+5] = p.color[1];
            color_data[i*8+6] = p.color[2];
            color_data[i*8+7] = p.color[3];
        }
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.a_color_buf);
        this.gl.bufferData(
            this.gl.ARRAY_BUFFER, new Uint8Array(color_data), this.gl.STATIC_DRAW);

        this.gl.drawArrays(this.gl.LINES, 0, 2 * this.list.length);
    }

    constructor(x1, y1, x2, y2) {
        super();

        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;

        // Cor padrão = preto
        this.color = [0, 0, 0, 255];

        this.constructor.list.push(this);
    }

    delete() {
        const index = this.constructor.list.indexOf(this);
        this.constructor.list.splice(index, 1);
    }

    set_position(x1, y1, x2, y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }

    set_color(r, g, b, a) {
        this.color = [r, g, b, a];
    }
}

class Polygon extends Base {
    static list = [];

    static get_atributos() {
        this.a_position = this.gl.getAttribLocation(this.program, "a_position");
        this.a_color = this.gl.getAttribLocation(this.program, "a_color");
    }

    static get_uniforms() {
        this.u_resolution = this.gl.getUniformLocation(this.program, "u_resolution");
    }

    static set_uniforms() {
        this.gl.uniform2f(
            this.u_resolution, this.gl.canvas.width, this.gl.canvas.height);
    }

    static init_vao_e_buffers() {
        super.init_vao_e_buffers();

        // a_position
        console.assert(this.a_position != null, "atributo a_position não foi setado");
        this.a_position_buf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.a_position_buf);
        this.gl.enableVertexAttribArray(this.a_position);
        this.gl.vertexAttribPointer(this.a_position, 2, this.gl.FLOAT, false, 0, 0);

        // a_color
        console.assert(this.a_color != null, "atributo a_color não foi setado");
        this.a_color_buf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.a_color_buf);
        this.gl.enableVertexAttribArray(this.a_color);
        this.gl.vertexAttribPointer(this.a_color, 4, this.gl.UNSIGNED_BYTE, true, 0, 0);
    }

    static draw(f_extra) {
        super.draw(f_extra);

        for (const p of this.list) {
            // a_position
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.a_position_buf);
            this.gl.bufferData(
                this.gl.ARRAY_BUFFER,
                new Float32Array(p.vertices),
                this.gl.STATIC_DRAW
            );

            // a_color
            let color_data = [];
            for (let i = 0; i < p.vertices.length/2; i++) {
                color_data = color_data.concat(p.color);
            }
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.a_color_buf);
            this.gl.bufferData(
                this.gl.ARRAY_BUFFER, new Uint8Array(color_data), this.gl.STATIC_DRAW);

            this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, p.vertices.length/2);
        }
    }

    constructor() {
        super();

        this.vertices = [];

        // Cor padrão = preto
        this.color = [0, 0, 0, 255];

        this.constructor.list.push(this);
    }

    delete() {
        const index = this.constructor.list.indexOf(this);
        this.constructor.list.splice(index, 1);
    }

    add_vertex(x, y) {
        this.vertices.push(x, y);
    }

    set_color(r, g, b, a) {
        this.color = [r, g, b, a];
    }
}

/** Função utilitária para gerar um número (float) entre min e max */
function randrange(min, max) {
    return Math.random() * (max - min) + min;
}

function main()
{
    // Cria e configura gl
    const canvas = document.querySelector("#canvas");
    const rect = canvas.getBoundingClientRect();
    const gl = canvas.getContext("webgl2");
    if (!gl) {
        alert("Sem suporte a WebGL 2.0");
        return;
    }

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(1, 1, 1, 1);

    // Compila programa a partir do código dos vertex e fragment shaders
    const program = initShaders(gl, "vs", "fs");

    // Configura classes primitivas
    Point.init(gl, program);
    Line.init(gl, program);
    Polygon.init(gl, program);

    // Pega referência de elementos
    const mouse_position_el = document.querySelector("#mouse_position");
    const btn_ponto = document.querySelector("#btn_ponto");
    const btn_linha = document.querySelector("#btn_linha");
    const btn_poligono = document.querySelector("#btn_poligono");
    const btn_limpar = document.querySelector("#btn_limpar");
    const cores_elms = {
        'vermelho' : document.querySelector("#cor_vermelho"),
        'amarelo'  : document.querySelector("#cor_amarelo"),
        'verde'    : document.querySelector("#cor_verde"),
        'azul'     : document.querySelector("#cor_azul"),
        'roxo'     : document.querySelector("#cor_roxo"),
        'preto'    : document.querySelector("#cor_preto"),
    }
    const cores = {
        'vermelho' : [255, 89, 94, 255],
        'amarelo'  : [255, 202, 58, 255],
        'verde'    : [138, 201, 38, 255],
        'azul'     : [25, 130, 196, 255],
        'roxo'     : [106, 76, 147, 255],
        'preto'    : [0, 0, 0, 255],
    }


    // Variáveis de controle
    let ferramenta = "point";
    let cor = cores.preto;
    let line_tmp;
    let polygon_tmp;

    // Botões
    btn_ponto.className = "selected";
    btn_ponto.onclick = () => {
        ferramenta = "point";
        btn_ponto.className = btn_ponto.className == "selected" ? "" : "selected";
        btn_linha.className = "";
        btn_poligono.className = "";
        polygon_tmp = undefined;
    }
    btn_linha.onclick = () => {
        ferramenta = "line";
        btn_linha.className = btn_linha.className == "selected" ? "" : "selected";
        btn_ponto.className = "";
        btn_poligono.className = "";
        polygon_tmp = undefined;
    }
    btn_poligono.onclick = () => {
        ferramenta = "polygon";
        btn_poligono.className = btn_poligono.className == "selected" ? "" : "selected";
        btn_ponto.className = "";
        btn_linha.className = "";
        polygon_tmp = undefined;
    }
    btn_limpar.onclick = () => {
        Point.list.length = 0;
        Line.list.length = 0;
        Polygon.list.length = 0;
        polygon_tmp = undefined;
    }

    // Seleção de cores
    for (const key of Object.keys(cores_elms)) {
        const btn = cores_elms[key];
        btn.onclick = () => {
            // Desseleciona todos
            Object.values(cores_elms).forEach((el) => el.className = "cor");

            // Seleciona o atual
            btn.className = "cor cor-selected";

            // Seta a cor
            cor = cores[key];
        }
    }

    // Inicializa mouse handling
    let mouseX, mouseY;
    canvas.onmousemove = (e) => {
        // O -1 é da borda de 1px
        mouseX = e.clientX - rect.left - 1;
        mouseY = e.clientY - rect.top - 1;

        mouse_position_el.textContent = `mouse_pos: (${mouseX}, ${mouseY})`;

        if (line_tmp != undefined) {
            line_tmp.set_position(line_tmp.x1, line_tmp.y1, mouseX, mouseY);
        }
    }

    canvas.onclick = (e) => {
        if (e.shiftKey) {
            return;
        }

        // Desenha um ponto
        if (
            ferramenta == "point"
            && !e.ctrlKey
        ) {
            const p = new Point(mouseX, mouseY);
            p.set_color.apply(p, cor);
            return;
        };

        // Começa a desenhar um polígono
        if (
            ferramenta == "polygon"
            && polygon_tmp == undefined
            && !e.ctrlKey
        ) {
            polygon_tmp = new Polygon();
            polygon_tmp.add_vertex(mouseX, mouseY);
            polygon_tmp.set_color.apply(polygon_tmp, cor);
            return;
        }

        // Adiciona pontos ao polígono que está sendo desenhado
        if (
            ferramenta == "polygon"
            && polygon_tmp != undefined
            && !e.ctrlKey
        ) {
            polygon_tmp.add_vertex(mouseX, mouseY);
            return;
        }

        // Finaliza o polígono sendo desenhado
        if (
            ferramenta == "polygon"
            && polygon_tmp != undefined
            && e.ctrlKey
        ) {
            polygon_tmp.add_vertex(mouseX, mouseY);
            polygon_tmp.add_vertex(polygon_tmp.vertices[0], polygon_tmp.vertices[1]);
            polygon_tmp = undefined;
        }
    }

    canvas.onmousedown = (e) => {
        if (e.ctrlKey || e.shiftKey) {
            return;
        }

        if (ferramenta == "line" && line_tmp == undefined) {
            line_tmp = new Line(mouseX, mouseY, mouseX, mouseY);
            line_tmp.set_color.apply(line_tmp, cor);
        }
    }

    canvas.onmouseup = (e) => {
        if (ferramenta == "line" && line_tmp != undefined) {
            if (line_tmp.x1 == line_tmp.x2 && line_tmp.y1 == line_tmp.y2) {
                line_tmp.delete();
            }
            line_tmp = undefined;
        }
    }

    canvas.onmouseleave = canvas.onmouseup;

    window.requestAnimationFrame(() => draw_scene(gl, program));
}

function draw_scene(gl, program) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    Polygon.draw();
    Line.draw();
    Point.draw();

    const ponto_count = document.querySelector("#ponto_count");
    const linha_count = document.querySelector("#linha_count");
    const poligono_count = document.querySelector("#poligono_count");

    ponto_count.textContent = `Pontos: ${Point.list.length}`;
    linha_count.textContent = `Linhas: ${Line.list.length}`;
    poligono_count.textContent = `Polígonos: ${Polygon.list.length}`;

    window.requestAnimationFrame(() => draw_scene(gl, program));
}

window.onload = main;
