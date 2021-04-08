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

/**
 * Depois de implementar as três primitivas (Point, Line, e Polygon), eu vi que elas
 * compartilham a maior parte dos atributos e uniforms, então vou criar mais uma camada
 * de abstração aqui chamada Primitive
 */
class Primitive extends Base {
    constructor() {
        super();

        // Cor padrão = preto
        this.color = [0, 0, 0, 255];
    }

    /* Toda primitiva precisa de pelo menos posições (vértices) e uma cor */
    static get_atributos() {
        this.a_position = this.gl.getAttribLocation(this.program, "a_position");
        this.a_color = this.gl.getAttribLocation(this.program, "a_color");
    }

    /* Toda primimitiva precisa saber qual a resolução do canvas */
    static get_uniforms() {
        this.u_resolution = this.gl.getUniformLocation(this.program, "u_resolution");
    }

    /* Configura uniform da resolução */
    static set_uniforms() {
        const width = this.gl.canvas.width;
        const height = this.gl.canvas.height;
        this.gl.uniform2f(this.u_resolution, width, height);
    }

    /* Configura buffers de posição e de cor */
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

    /* Toda instância de uma primitiva precisa de um método delete() (igual em todas) */
    delete() {
        const index = this.constructor.list.indexOf(this);
        this.constructor.list.splice(index, 1);
    }

    /* Toda instância de uma primitiva precisa do método que seta sua cor */
    set_color(r, g, b, a) {
        this.color = [r, g, b, a];
    }
}

class Point extends Primitive {
    static list = [];

    static get_uniforms() {
        super.get_uniforms();
        this.u_pointsize = this.gl.getUniformLocation(this.program, "u_pointsize");
    }

    static set_uniforms() {
        super.set_uniforms();
        this.gl.uniform1f(this.u_pointsize, 3);
    }

    static draw(f_extra) {
        super.draw(f_extra);

        // Carrega buffer de posições com os vértices de todos os pontos
        // a_position
        const position_data = Array(2 * this.list.length);
        for (let i = 0; i < this.list.length; i++) {
            const p = this.list[i];
            position_data[i*2+0] = p.x;
            position_data[i*2+1] = p.y;
        }
        const arr_position = new Float32Array(position_data);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.a_position_buf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, arr_position, this.gl.STATIC_DRAW);

        // Carrega buffer de cores com a cor de todos os pontos
        // a_color
        const color_data = Array(4 * this.list.length);
        for (let i = 0; i < this.list.length; i++) {
            const p = this.list[i];
            color_data[i*4+0] = p.color[0];
            color_data[i*4+1] = p.color[1];
            color_data[i*4+2] = p.color[2];
            color_data[i*4+3] = p.color[3];
        }
        const arr_color = new Uint8Array(color_data);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.a_color_buf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, arr_color, this.gl.STATIC_DRAW);

        // Desenha todos os pontos
        this.gl.drawArrays(this.gl.POINTS, 0, this.list.length);
    }

    constructor(x, y) {
        super();

        this.x = x;
        this.y = y;

        this.constructor.list.push(this);
    }

    set_position(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Line extends Primitive {
    static list = [];

    static draw(f_extra) {
        super.draw(f_extra);

        // Carrega o buffer de posições com os vértices de todas as linhas
        // a_position
        const position_data = Array(2 * 2 * this.list.length);
        for (let i = 0; i < this.list.length; i++) {
            const l = this.list[i];
            position_data[i*4+0] = l.x1;
            position_data[i*4+1] = l.y1;
            position_data[i*4+2] = l.x2;
            position_data[i*4+3] = l.y2;
        }
        const arr_position = new Float32Array(position_data);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.a_position_buf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, arr_position, this.gl.STATIC_DRAW);

        // Carrega o buffer de cores com as cores de todas as linhas
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
        const arr_color = new Uint8Array(color_data);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.a_color_buf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, arr_color, this.gl.STATIC_DRAW);

        // Desenha todos as linhas
        this.gl.drawArrays(this.gl.LINES, 0, 2 * this.list.length);
    }

    constructor(x1, y1, x2, y2) {
        super();

        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;

        this.constructor.list.push(this);
    }

    set_position(x1, y1, x2, y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }
}

class Polygon extends Primitive {
    static list = [];

    static draw(f_extra) {
        super.draw(f_extra);

        // No caso dos polígonos, é preciso fazer uma chamada separada pra cada um por
        // causa do comportamento padrão das primitivas GL (tanto TRIANGLE_FAN quanto
        // TRIANGLE_STRIP).
        for (const p of this.list) {
            // a_position
            const arr_position = new Float32Array(p.vertices);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.a_position_buf);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, arr_position, this.gl.STATIC_DRAW);

            // a_color
            let color_data = [];
            for (let i = 0; i < p.vertices.length/2; i++) {
                color_data = color_data.concat(p.color);
            }
            const arr_color = new Uint8Array(color_data);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.a_color_buf);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, arr_color, this.gl.STATIC_DRAW);

            // Desenha este polígono
            this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, p.vertices.length/2);
        }
    }

    constructor() {
        super();

        this.vertices = [];

        this.constructor.list.push(this);
    }

    add_vertex(x, y) {
        this.vertices.push(x, y);
    }
}

/** Função utilitária para gerar um número (float) entre min e max */
function randrange(min, max) {
    return Math.random() * (max - min) + min;
}

/** Função que retorna um dicionário com elementos DOM necessários e outras coisas */
function get_elementos() {
    return {
        "canvas": document.querySelector("#canvas"),
        "mouse_position_el": document.querySelector("#mouse_position"),
        "botoes": {
            "point": document.querySelector("#btn_ponto"),
            "line": document.querySelector("#btn_linha"),
            "polygon": document.querySelector("#btn_poligono"),
        },
        "btn_limpar": document.querySelector("#btn_limpar"),
        "cores_elms": {
            'vermelho' : document.querySelector("#cor_vermelho"),
            'amarelo'  : document.querySelector("#cor_amarelo"),
            'verde'    : document.querySelector("#cor_verde"),
            'azul'     : document.querySelector("#cor_azul"),
            'roxo'     : document.querySelector("#cor_roxo"),
            'preto'    : document.querySelector("#cor_preto"),
        },
        "cores": {
            'vermelho' : [255, 89, 94, 255],
            'amarelo'  : [255, 202, 58, 255],
            'verde'    : [138, 201, 38, 255],
            'azul'     : [25, 130, 196, 255],
            'roxo'     : [106, 76, 147, 255],
            'preto'    : [0, 0, 0, 255],
        }
    }
}

/** Função de inicialização do WebGL (gl, program, etc) */
function init_webgl(refs) {
    const gl = refs.canvas.getContext("webgl2");
    if (!gl) {
        alert("Sem suporte a WebGL 2.0");
        throw Error("Sem suporte a WebGL 2.0");
    }

    const program = initShaders(gl, "vs", "fs");

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(1, 1, 1, 1);
    gl.lineWidth(3);

    // Inicializa classes primitivas
    Point.init(gl, program);
    Line.init(gl, program);
    Polygon.init(gl, program);

    return [ gl, program ];
}

/** Função que inicializa os botões de seleção de cores */
function init_cores(refs, controle) {
    const cores_elms = refs.cores_elms;

    for (const key of Object.keys(cores_elms)) {
        const btn = cores_elms[key];
        btn.onclick = () => {
            // Desseleciona todos (removendo a classe css "cor-selected")
            Object.values(cores_elms).forEach((el) => el.className = "cor");

            // Seleciona o atual (que é o botão que foi clicado)
            btn.className = "cor cor-selected";

            // Seta a cor nas variáveis de controle
            controle.cor = refs.cores[key];

            // Muda a cor do polígono se ele estiver sendo desenhado
            const polygon_tmp = controle.polygon_tmp;
            if (polygon_tmp != undefined) {
                polygon_tmp.set_color.apply(polygon_tmp, controle.cor);
            }
            const polygon_first_line = controle.polygon_first_line;
            if (polygon_first_line != undefined) {
                polygon_first_line.set_color.apply(polygon_first_line, controle.cor);
            }
        }
    }
}

/** Função que finaliza/interrompe o desenho de um polígono */
function finaliza_polygon(controle) {
    const polygon_tmp = controle.polygon_tmp;
    const polygon_first_line = controle.polygon_first_line;

    // Nada a fazer se não estivermos durante o desenho de um polígono
    if (polygon_tmp == undefined) {
        return;
    }

    // Remove o último vértice do polígono temporário (vértice que segue o mouse)
    polygon_tmp.vertices.pop();
    polygon_tmp.vertices.pop();

    // Se o polígono sendo desenhado tiver menos do que 3 vértices (lembrar que o último
    // foi removido), significa que ele não é um polígono, então deve ser deletado.
    if (polygon_tmp.vertices.length/2 < 3) {
        polygon_tmp.delete();
    }

    // Se a linha temporária do primeiro polígono ainda estiver desenhada, também
    // devemos deletá-la.
    if (polygon_first_line != undefined) {
        polygon_first_line.delete();
    }

    controle.polygon_tmp = undefined;
    controle.polygon_first_line = undefined;
}

/** Função que inicializa os botões de ferramenta */
function init_botoes(refs, controle) {
    const botoes = refs.botoes;

    // Configuração dos botões de primitivas
    for (const key of Object.keys(botoes)) {
        const btn = botoes[key];

        btn.onclick = () => {
            // Desseleciona todos os botões
            Object.values(botoes).forEach((el) => el.className = "");

            // Seleciona o atual (botão que foi clicado)
            btn.className = "selected";

            // Seta a ferramenta
            controle.ferramenta = key;

            // Finaliza polígono, caso exista
            finaliza_polygon(controle);
        }
    }

    // Configuração do botão de limpar
    refs.btn_limpar.onclick = () => {
        Point.list.length = 0;
        Line.list.length = 0;
        Polygon.list.length = 0;
        finaliza_polygon(controle);
    }
}

/** Função que inicializa o mouse handling */
function init_mouse(refs, controle) {

    // Movimento do mouse
    refs.canvas.onmousemove = (e) => {
        const rect = refs.canvas.getBoundingClientRect();

        // O -1 é da borda de 1px
        controle.mouseX = e.clientX - rect.left - 1;
        controle.mouseY = e.clientY - rect.top - 1;

        const mouseX = controle.mouseX;
        const mouseY = controle.mouseY;

        // Atualiza texto da posição do mouse
        refs.mouse_position_el.textContent = `mouse_pos: (${mouseX}, ${mouseY})`;

        // Efeito de rubber band -- atualiza posição do último vértice da linha/polígono
        const line_tmp = controle.line_tmp;
        const polygon_tmp = controle.polygon_tmp;
        const polygon_first_line = controle.polygon_first_line;
        if (line_tmp != undefined) {
            line_tmp.set_position(line_tmp.x1, line_tmp.y1, mouseX, mouseY);
        }
        if (polygon_tmp != undefined) {
            polygon_tmp.vertices[polygon_tmp.vertices.length-2] = mouseX;
            polygon_tmp.vertices[polygon_tmp.vertices.length-1] = mouseY;
        }
        if (polygon_first_line != undefined) {
            polygon_first_line.set_position(
                polygon_first_line.x1, polygon_first_line.y1, mouseX, mouseY);
        }
    }

    // Clique do mouse (principais funcionalidades de desenho)
    refs.canvas.onclick = (e) => {
        // Não faz nada se o shift estiver pressionado
        if (e.shiftKey) { return; }

        const mouseX = controle.mouseX;
        const mouseY = controle.mouseY;
        const cor = controle.cor;

        // Desenha um ponto
        if (
            controle.ferramenta == "point"
            && !e.ctrlKey
        ) {
            const p = new Point(mouseX, mouseY);
            p.set_color.apply(p, cor);
            return;
        };

        // Começa a desenhar um polígono
        if (
            controle.ferramenta == "polygon"
            && controle.polygon_tmp == undefined
            && !e.ctrlKey
        ) {
            // Cria um polígono
            const polygon_tmp = controle.polygon_tmp = new Polygon();
            polygon_tmp.add_vertex(mouseX, mouseY);
            polygon_tmp.add_vertex(mouseX, mouseY);
            polygon_tmp.set_color.apply(polygon_tmp, cor);

            // Cria uma linha temporária para a primeira aresta do polígono
            controle.polygon_first_line = new Line(mouseX, mouseY, mouseX, mouseY);
            controle.polygon_first_line.set_color.apply(controle.polygon_first_line, cor);
            return;
        }

        // Adiciona pontos ao polígono que está sendo desenhado
        if (
            controle.ferramenta == "polygon"
            && controle.polygon_tmp != undefined
            && !e.ctrlKey
        ) {
            // Adiciona vértice
            const polygon_tmp = controle.polygon_tmp;
            polygon_tmp.add_vertex(mouseX, mouseY);

            // Deleta polygon_first_line se ela existir
            if (controle.polygon_first_line != undefined) {
                controle.polygon_first_line.delete();
                controle.polygon_first_line = undefined;
            }
            return;
        }

        // Finaliza o polígono sendo desenhado se o usuário clicar segurando ctrl
        // (Adiciona o vértice e depois finaliza, diferente de apertar ESC)
        if (
            controle.ferramenta == "polygon"
            && controle.polygon_tmp != undefined
            && e.ctrlKey
        ) {
            const polygon_tmp = controle.polygon_tmp;
            polygon_tmp.add_vertex(mouseX, mouseY);
            polygon_tmp.add_vertex(polygon_tmp.vertices[0], polygon_tmp.vertices[1]);
            controle.polygon_tmp = undefined;
        }
    }

    // Clicar e arrastar o mouse (para desenho de linhas)
    refs.canvas.onmousedown = (e) => {
        // Não faz nada com ctrl nem shift
        if (e.ctrlKey || e.shiftKey) { return; }

        const mouseX = controle.mouseX;
        const mouseY = controle.mouseY;

        // Desenha linha
        if (
            controle.ferramenta == "line"
            && controle.line_tmp == undefined
        ) {
            controle.line_tmp = new Line(mouseX, mouseY, mouseX, mouseY);
            controle.line_tmp.set_color.apply(controle.line_tmp, controle.cor);
            return;
        }
    }

    // Soltar o mouse (para desenho de linha)
    refs.canvas.onmouseup = (e) => {
        if (
            controle.ferramenta == "line"
            && controle.line_tmp != undefined
        ) {
            const line_tmp = controle.line_tmp;
            // Deleta a linha se as 2 extremidades forem coincidentes (o usuário apenas
            // clicou em vez de segurar a arrastar o mouse)
            if (line_tmp.x1 == line_tmp.x2 && line_tmp.y1 == line_tmp.y2) {
                line_tmp.delete();
            }

            // "Comita" a linha. Remove a referência da linha temporária de trabalho,
            // mas a instância dela ainda está na lista linhas (Line.list)
            controle.line_tmp = undefined;

            return;
        }
    }

    // Considera que o botão do mouse foi solto ao sair do canvas
    refs.canvas.onmouseleave = refs.canvas.onmouseup;
}

function main()
{
    // Inicialização
    const refs = get_elementos();
    const [ gl, program ] = init_webgl(refs);

    // Variáveis de controle
    const controle = {
        "ferramenta": "point",
        "cor": refs.cores.preto,
        "line_tmp": undefined,
        "polygon_tmp": undefined,
        "polygon_first_line": undefined,
        "mouseX": undefined,
        "mouseY": undefined,
    }

    // Configura botões de seleção de cores
    init_cores(refs, controle);

    // Configura botões de ferramentas
    init_botoes(refs, controle);

    // Configura mouse handling
    init_mouse(refs, controle);

    // Configura keyboard handling
    document.addEventListener ('keyup', (event) => {
        // Finaliza polígono pressionando ESC
        if (event.key == "Escape") {
            finaliza_polygon(controle);
        }
    });

    window.requestAnimationFrame(() => draw_scene(gl, program));
}

function draw_scene(gl, program) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Desenha todos os polígonos, linhas, e pontos
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
