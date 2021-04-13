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
    static tol = 6; // tolerância de pick em pixels

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

    /**
     * Verifica se determinado ponto (xm, ym) seleciona algum dos objetos.
     * Retorna a referência do objeto caso selecione e undefined caso contrário.
     * Os objetos são testados na ordem do último para o primeiro para que somente o
     * mais à frente (mais recente) seja selecionado.
     * Este método deve ser sobrescrito nas subclasses.
     */
    static pick() {}
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

    static pick(xm, ym) {
        for (const p of this.list.slice().reverse()) {
            if (
                xm > p.x - this.tol
                && xm < p.x + this.tol
                && ym > p.y - this.tol
                && ym < p.y + this.tol
            ) {
                return p;
            }
        }
        return;
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

    translate(dx, dy) {
        this.set_position(this.x + dx, this.y + dy);
    }
}

class Line extends Primitive {
    static list = [];

    // Codificações para pick de linha
    static codificacao = [ 0b1000, 0b0100, 0b0010, 0b0001 ]; // left, right, down, up

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

    static pick(xm, ym) {
        const tol = this.tol;
        const [ left, right, down, up ] = this.codificacao;

        forpickline: for (const l of this.list.slice().reverse()) {
            let [ x1, y1, x2, y2 ] = [ l.x1, l.y1, l.x2, l.y2 ];

            // y - y0 = m * (x - x0)
            const m = (y2 - y1) / (x2 - x1);

            // Laço de teste movendo p1 pelas fronteiras, caso necessário
            const code_p2 = this.encode(x2, y2, xm, ym);
            while (true) {
                const code_p1 = this.encode(x1, y1, xm, ym);

                // Um dos pontos extremos coincide com (xm, ym)
                if (code_p1 == 0b0000 || code_p2 == 0b0000) { return l; }

                // Casos impossíveis de cruzar com o retângulo de tolerância
                if ((code_p1 & code_p2) != 0b0000) { continue forpickline; }

                // Não caiu num caso trivial? Move p1 para a próxima fronteira
                if (code_p1 & left) {
                    y1 += m * (xm - tol - x1);
                    x1 = xm - tol;
                } else if (code_p1 & right) {
                    y1 += m * (xm + tol - x1);
                    x1 = xm + tol;
                } else if (code_p1 & down) {
                    x1 += (1/m) * (ym - tol - y1);
                    y1 = ym - tol;
                } else if (code_p1 & up) {
                    x1 += (1/m) * (ym + tol - y1);
                    y1 = ym + tol;
                } else {
                    return l;
                }
            }
        }
        return;
    }

    /** Método que retorna a codificação do ponto (x, y) em relação ao ponto (xm, ym) */
    static encode(x, y, xm, ym) {
        const [ left, right, down, up ] = this.codificacao;
        const tol = this.tol;

        let codigo = 0;

        if (x < xm - tol) codigo |= left;
	    if (x > xm + tol) codigo |= right;
	    if (y < ym - tol) codigo |= down;
	    if (y > ym + tol) codigo |= up;

        return codigo;
    }

    constructor(x1, y1, x2, y2) {
        super();

        // Coordenadas "originais" são usadas para calcular transformações lineares
        this.x1 = this.x1_orig = x1;
        this.y1 = this.y1_orig = y1;
        this.x2 = this.x2_orig = x2;
        this.y2 = this.y2_orig = y2;

        this.rotation = 0;
        this.constructor.list.push(this);
    }

    set_position(x1, y1, x2, y2) {
        this.x1 = this.x1_orig = x1;
        this.y1 = this.y1_orig = y1;
        this.x2 = this.x2_orig = x2;
        this.y2 = this.y2_orig = y2;
    }

    boundingbox() {
        const largura = Math.abs(this.x2 - this.x1);
        const altura = Math.abs(this.y2 - this.y1);

        return {
            'xc': (this.x2 + this.x1) / 2,
            'yc': (this.y2 + this.y1) / 2,
            'w': largura,
            'h': altura,
        }
    }

    translate(dx, dy) {
        this.set_position(this.x1 + dx, this.y1 + dy, this.x2 + dx, this.y2 + dy);
    }

    rotate(graus) {
        const theta = graus * Math.PI / 180;
        this.rotation = graus;

        const xc = (this.x1_orig + this.x2_orig) / 2;
        const yc = (this.y1_orig + this.y2_orig) / 2;

        const cos = Math.cos(theta).toFixed(3);
        const sin = Math.sin(theta).toFixed(3);

        // P1
        this.x1 = xc + (this.x1_orig - xc) * cos - (this.y1_orig - yc) * sin;
        this.y1 = yc + (this.x1_orig - xc) * sin + (this.y1_orig - yc) * cos;

        // P2
        this.x2 = xc + (this.x2_orig - xc) * cos - (this.y2_orig - yc) * sin;
        this.y2 = yc + (this.x2_orig - xc) * sin + (this.y2_orig - yc) * cos;
    }
}

class Polygon extends Primitive {
    static list = [];
    static debug_tri = false;

    static draw(f_extra) {
        super.draw(f_extra);

        let total_vertices = 0;
        const jsarr_position = [];
        const jsarr_color = [];
        for (const p of this.list) {
            // Pula polígonos não triangulados ou que têm menos do que 1 triângulo
            // Obs: p.triangles é preenchida na p.triangulate()
            if (p.triangles == undefined || p.triangles.length == 0) continue;

            for (const t of p.triangles) {
                total_vertices += 3;

                // a_position
                jsarr_position.push(t[0].x, t[0].y, t[1].x, t[1].y, t[2].x, t[2].y);

                // a_color
                let color_data;
                if (this.debug_tri) {
                    // Cor aleatória pra cada triângulo baseado nos vértices
                    seed = t[0].x + t[0].y + t[1].x + t[1].y + t[2].x + t[2].y;
                    const randcolor = [255*random(), 255*random(), 255*random(), 255];
                    color_data = [...randcolor, ...randcolor, ...randcolor];
                } else {
                    color_data = [...p.color, ...p.color, ...p.color];
                }
                jsarr_color.push(...color_data);
            }
        }

        // a_position
        const arr_position = new Float32Array(jsarr_position);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.a_position_buf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, arr_position, this.gl.STATIC_DRAW);

        // a_color
        const arr_color = new Uint8Array(jsarr_color);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.a_color_buf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, arr_color, this.gl.STATIC_DRAW);

        this.gl.drawArrays(this.gl.TRIANGLES, 0, total_vertices);
    }

    static raio_intercepta_linha(xm, ym, x1, y1, x2, y2)
    {
        // Evita que os coeficientes angulares deem divisão por zero causando seleções
        // em locais errados
        xm += 0.1;

        // Garante que p1 está acima de p2
        if (y1 >= y2) {
            [ x1, x2 ] = [ x2, x1 ];
            [ y1, y2 ] = [ y2, y1 ];
        }

        if (ym == y1 || ym == y2) {
            ym = ym + this.tol/2;
        }

        if (ym < y1 || ym > y2) {
            return false;
        } else if (xm > Math.max(x1, x2)) {
            return false;
        } else if (xm < Math.min(x1, x2)) {
            return true;
        } else {
            // m1 = coef. ang. entre p1 e p2
            const m1 = (y2 - y1) / (x2 - x1);

            // m2 = coef. ang. entre p1 e pmouse (ponto clicado)
            const m2 = (ym - y1) / (xm - x1);

            return m2 >= m1;
        }
    }

    static pick(xm, ym) {
        for (const p of this.list.slice().reverse()) {
            const vertices = p.ordered_vertices.slice();
            vertices.push(vertices[0]);

            let count = 0;
            for (let i = 0; i < vertices.length-1; i++) {
                const [ x1, y1 ] = [ vertices[i+0].x, vertices[i+0].y ];
                const [ x2, y2 ] = [ vertices[i+1].x, vertices[i+1].y ];
                if (this.raio_intercepta_linha(xm, ym, x1, y1, x2, y2)) {
                    count++;
                }
            }

            // Seleciona caso interceptar um número ímpar de vezes
            if (count%2 != 0) {
                return p;
            }
        }
        return;
    }

    constructor() {
        super();

        this.vertices = [];

        this.constructor.list.push(this);
    }

    // Retorna coordenada polar do ponto em relação ao ponto (xcm, ycm)
    polar(ponto, xcm, ycm) {
        return Math.atan2(ponto.y - ycm, ponto.x - xcm);
    }

    // Retorna quadrado da distância do ponto a (xcm, ycm)
    sqdist(ponto, xcm, ycm) {
        return (ponto.x - xcm)**2 + (ponto.y - ycm)**2;
    }

    // Retorna true se o ponto (x, y) está dentro do triângulo p1p2p3
    p_inside_tri(x, y, p1, p2, p3) {
        const l1 = (x-p1.x) * (p3.y-p1.y) - (p3.x-p1.x) * (y-p1.y);
        const l2 = (x-p2.x) * (p1.y-p2.y) - (p1.x-p2.x) * (y-p2.y);
        const l3 = (x-p3.x) * (p2.y-p3.y) - (p2.x-p3.x) * (y-p3.y);
        return (l1>0 && l2>0  && l3>0) || (l1<0 && l2<0 && l3<0);
    }

    // Retorna true se o ângulo p1p2p3 em relação a cm for menor do que 180
    is_p2_convex(xcm, ycm, p1, p2, p3) {
        // Vetor p2->p1
        const v1 = [ p1.x - p2.x, p1.y - p2.y ];
        const v1_mod = Math.sqrt(v1[0]**2 + v1[1]**2);

        // Vetor p2->cm
        const v2 = [ xcm - p2.x, ycm - p2.y ];
        const v2_mod = Math.sqrt(v2[0]**2 + v2[1]**2);

        // Vetor p2->p3
        const v3 = [ p3.x - p2.x, p3.y - p2.y ];
        const v3_mod = Math.sqrt(v3[0]**2 + v3[1]**2);

        // Ângulo entre v1 e v2
        const alfa1 = Math.acos((v1[0]*v2[0] + v1[1]*v2[1]) / (v1_mod * v2_mod));

        // Ângulo entre v2 e v3
        const alfa2 = Math.acos((v2[0]*v3[0] + v2[1]*v3[1]) / (v2_mod * v3_mod));

        return (alfa1 + alfa2) < Math.PI;
    }

    /**
     * Encontra ordem dos vértices que resulta em um polígono simples (sem buracos
     * e sem arestas que se cruzam)
     * Fonte: https://stackoverflow.com/a/59293807/1694726
     */
    sort_vertices() {
        // Cria array auxilar com os pontos
        const points = [];
        outerforsort: for (let i = 0; i < this.vertices.length-1; i += 2) {
            const new_p = {
                "x": this.vertices[i],
                "y": this.vertices[i+1]
            };

            // Desconsidera pontos com coordenadas iguais
            for (const p of points) {
                if (new_p.x == p.x && new_p.y == p.y) {
                    continue outerforsort;
                }
            }

            points.push(new_p);
        }

        // Encontra "centro de massa" dos pontos
        const xcm = points.reduce((sum, p) => sum + p.x, 0) / points.length;
        const ycm = points.reduce((sum, p) => sum + p.y, 0) / points.length;
        [ this.xcm, this.ycm ] = [ xcm, ycm ];

        // Encontra as coordenadas polares e os quadrados das distâncias de cada ponto
        // ao centro de massa
        for (let p of points) {
            p.polar = this.polar(p, xcm, ycm);
            p.sqdist = this.sqdist(p, xcm, ycm);
        }

        // Ordena os pontos pela coord. polar e quadrado da distância
        points.sort((a, b) => a.polar - b.polar || a.sqdist - b.sqdist);

        this.ordered_vertices = points;
    }

    /**
     * Triangula polígono usando o algoritmo ear-clipping ingênuo
     * Obs: é necessário executar p.sort_vertices() primeiro
     * Fonte: https://www.geometrictools.com/Documentation/TriangulationByEarClipping.pdf
     */
    triangulate() {
        const points = this.ordered_vertices.slice();

        this.triangles = [];
        if (points.length < 3) return;

        while (points.length > 3) {

            outertrifor: for (let i = 0;; i++) {
                const [ p1, p2, p3 ] = [
                    points[(i+0)%(points.length)],
                    points[(i+1)%(points.length)],
                    points[(i+2)%(points.length)],
                ];

                // Se algum dos outros pontos do polígono está dentro de p1p2p3, então
                // p1p2p3 não é uma "orelha".
                const outros_pontos = points.filter(p => ![ p1, p2, p3 ].includes(p));
                for (const outro_p of outros_pontos) {
                    if (this.p_inside_tri(outro_p.x, outro_p.y, p1, p2, p3)) {
                        continue outertrifor;
                    }
                }

                // Testa se p2 é convexo calculando os ângulos entre os vetores
                if (this.is_p2_convex(this.xcm, this.ycm, p1, p2, p3)) {
                    this.triangles.push([p1, p2, p3]);
                    points.splice(points.indexOf(p2), 1);
                    break outertrifor;
                }
            }
        }

        // Adiciona o último triângulo
        const [ p1, p2, p3 ] = [ points[0], points[1], points[2] ];
        this.triangles.push([p1, p2, p3]);
    }

    add_vertex(x, y) {
        this.vertices.push(x, y);
        this.sort_vertices();
        this.triangulate();
    }

    update_last_vertex(x, y) {
        this.vertices[this.vertices.length-2] = x;
        this.vertices[this.vertices.length-1] = y;
        this.sort_vertices();
        this.triangulate();
    }

    boundingbox() {
        const xs = this.ordered_vertices.map(p => p.x);
        const ys = this.ordered_vertices.map(p => p.y);

        const [ xmax, xmin ] = [ Math.max(...xs), Math.min(...xs) ];
        const [ ymax, ymin ] = [ Math.max(...ys), Math.min(...ys) ];

        const largura = xmax - xmin;
        const altura = ymax - ymin;

        return {
            'xc': (xmax+xmin)/2,
            'yc': (ymax+ymin)/2,
            'w': largura,
            'h': altura,
        }

    }

    translate(dx, dy) {
        for (let i = 0; i < this.vertices.length-1; i+=2) {
            this.vertices[i+0] += dx;
            this.vertices[i+1] += dy;
        }

        // Acho que seria mais eficiente mover os triângulos. Mas é mais fácil simples-
        // mente triangular de novo
        this.sort_vertices();
        this.triangulate();
    }
}

class Box {
    constructor(xc, yc, w, h) {
        this.lines = [
            new Line(xc-w/2, yc-h/2, xc-w/2, yc+h/2),
            new Line(xc-w/2, yc+h/2, xc+w/2, yc+h/2),
            new Line(xc+w/2, yc+h/2, xc+w/2, yc-h/2),
            new Line(xc+w/2, yc-h/2, xc-w/2, yc-h/2),
        ];
        this.set_claro();
    }

    set_lines(xc, yc, w, h) {
        this.lines[0].set_position(xc-w/2, yc-h/2, xc-w/2, yc+h/2);
        this.lines[1].set_position(xc-w/2, yc+h/2, xc+w/2, yc+h/2);
        this.lines[2].set_position(xc+w/2, yc+h/2, xc+w/2, yc-h/2);
        this.lines[3].set_position(xc+w/2, yc-h/2, xc-w/2, yc-h/2);
    }

    set_claro() {
        for (const l of this.lines) {
            l.set_color(140, 140, 140, 200);
        }
    }

    set_escuro() {
        for (const l of this.lines) {
            l.set_color(120, 120, 120, 255);
        }
    }

    delete() {
        for (const l of this.lines) {
            l.delete();
        }
    }
}

/** Função que retorna um dicionário com elementos DOM necessários e outras coisas */
function get_elementos() {
    return {
        "canvas": document.querySelector("#canvas"),
        "mouse_position_el": document.querySelector("#mouse_position"),
        "ponto_count": document.querySelector("#ponto_count"),
        "linha_count": document.querySelector("#linha_count"),
        "poligono_count": document.querySelector("#poligono_count"),
        "msg": document.querySelector("#msg"),
        "debug_tri": document.querySelector("#debug_tri"),
        "slider_rot": document.querySelector("#slider-rot"),
        "slider_esc": document.querySelector("#slider-esc"),
        "slider_rot_div": document.querySelector("#slider-rot-div"),
        "slider_esc_div": document.querySelector("#slider-esc-div"),
        "botoes": {
            "point": document.querySelector("#btn_ponto"),
            "line": document.querySelector("#btn_linha"),
            "polygon": document.querySelector("#btn_poligono"),
            "select": document.querySelector("#btn_selecionar"),
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
                polygon_tmp.set_color(...controle.cor);
            }
            const polygon_first_line = controle.polygon_first_line;
            if (polygon_first_line != undefined) {
                polygon_first_line.set_color(...controle.cor);
            }
        }
    }
}

/** Função que finaliza/interrompe o desenho de um polígono */
function finaliza_polygon(refs, controle) {
    const polygon_tmp = controle.polygon_tmp;
    const polygon_first_line = controle.polygon_first_line;

    // Nada a fazer se não estivermos durante o desenho de um polígono
    if (polygon_tmp == undefined) {
        return;
    }

    // Remove o último vértice do polígono temporário (vértice que segue o mouse)
    polygon_tmp.vertices.pop();
    polygon_tmp.vertices.pop();

    // Depois de remover o último vértice, temos que retriangular
    polygon_tmp.sort_vertices();
    polygon_tmp.triangulate();

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

    // Limpa mensagem de status
    refs.msg.textContent = "";

    // Remove objetos temporários
    controle.polygon_tmp = undefined;
    controle.polygon_first_line = undefined;
}

/**
 * Função que reseta controles para configurações iniciais e também remove objetos
 * temporários. Mantém apenas a ferramenta selecionada e a cor
 */
function reset_controles(refs, controle) {
    // Deleta objetos temporários
    if (controle.line_tmp != undefined) controle.line_tmp.delete();
    if (controle.polygon_tmp != undefined) controle.polygon_tmp.delete();
    if (controle.polygon_first_line != undefined) controle.polygon_first_line.delete();
    if (controle.hoverbox != undefined) controle.hoverbox.delete();

    // Esconde sliders
    refs.slider_rot_div.hidden = true;
    refs.slider_esc_div.hidden = true;

    // Reseta valores iniciais
    controle.line_tmp = undefined;
    controle.polygon_tmp = undefined;
    controle.polygon_first_line = undefined;
    controle.mouseX = undefined;
    controle.mouseY = undefined;
    controle.hoverbox = undefined;
    controle.hovered_obj = undefined;
    controle.selected_obj = undefined;
    controle.arrastando = false;
}

/**
 * Efeito de rubber band. Atualiza a posição do último vértice da linha ou do polígono
 * temporário. Deve ser chamada dentro do handler do mousemove.
 */
function rubber_band(mouseX, mouseY, controle) {
    const line_tmp = controle.line_tmp;
    const polygon_tmp = controle.polygon_tmp;
    const polygon_first_line = controle.polygon_first_line;

    if (line_tmp != undefined) {
        line_tmp.set_position(line_tmp.x1, line_tmp.y1, mouseX, mouseY);
    }
    if (polygon_tmp != undefined) {
        polygon_tmp.update_last_vertex(mouseX, mouseY);
    }
    if (polygon_first_line != undefined) {
        polygon_first_line.set_position(
            polygon_first_line.x1, polygon_first_line.y1, mouseX, mouseY);
    }
}

/** Função que lida com o evento mousemove do mouse */
function mousemove_handler(e, refs, controle) {
    const rect = refs.canvas.getBoundingClientRect();

    // O -1 é da borda de 1px
    controle.mouseX = e.clientX - rect.left - 1;
    controle.mouseY = e.clientY - rect.top - 1;

    const mouseX = controle.mouseX;
    const mouseY = controle.mouseY;

    // Atualiza texto da posição do mouse
    refs.mouse_position_el.textContent = `mouse_pos: (${mouseX}, ${mouseY})`;

    // Atualiza posição do último vértice do objeto sendo desenhado
    rubber_band(mouseX, mouseY, controle);

    // Modo de seleção: hoverbox e translação por arrastamento
    if (controle.ferramenta == "select") {
        // Ordem de prioridade de seleção: primeiro se verifica se há um objeto de fato
        // selecionado. Se não houver, faz pick de ponto, linha, ou polígono nessa ordem
        const obj_sel = controle.selected_obj
            || Point.pick(mouseX, mouseY)
            || Line.pick(mouseX, mouseY)
            || Polygon.pick(mouseX, mouseY);

        // Se nada estiver selecionado ou em hover, não faz nada. Obs: se depois tiver
        // outra ferramenta que precise de mousemove, não poderia dar return aqui
        if (obj_sel == undefined) {
            // Remove hoverbox se ela existir e remove referência do hovered_obj
            if (controle.hoverbox != undefined) {
                controle.hoverbox.delete();
                controle.hoverbox = undefined;
                controle.hovered_obj = undefined;
            }
            return;
        }

        // Ignora se obj_sel for uma das linhas da hoverbox
        if (
            controle.hoverbox != undefined
            && controle.hoverbox.lines.includes(obj_sel)
        ) {
            return;
        }

        // Seta o objeto como sendo o atualmente sob o mouse (hover)
        controle.hovered_obj = obj_sel;

        // Define parâmetros da hoverbox dependendo do tipo de objeto
        let hoverbox_params;
        if (obj_sel instanceof Point) {
            hoverbox_params = [ obj_sel.x, obj_sel.y, 20, 20 ];
        } else if (obj_sel instanceof Line || obj_sel instanceof Polygon) {
            const bbox = obj_sel.boundingbox();
            hoverbox_params = [ bbox.xc, bbox.yc, bbox.w + 20, bbox.h + 20 ];
        }

        // Cria hoverbox se ela não existir e atualiza se existir
        if (controle.hoverbox == undefined) {
            controle.hoverbox = new Box(...hoverbox_params);
        } else {
            controle.hoverbox.set_lines(...hoverbox_params);
        }
    }
}

function mousedrag_handler(e, refs, controle) {
    // Se existir um objeto hovered e eu comecei a arrastar, configura para a translação
    if (
        controle.ferramenta == "select"
        && controle.hovered_obj != undefined
        && controle.selected_obj == undefined
    ) {
        controle.arrastando = true;

        // Escurece hoverbox
        controle.hoverbox.set_escuro();

        // Seta ele como selecionado de fato
        controle.selected_obj = controle.hovered_obj;
    }

    // Se estou arrastando e existe um objeto selecionado, translada
    if (
        controle.ferramenta == "select"
        && controle.selected_obj != undefined
        && controle.arrastando == true
    ) {
        controle.selected_obj.translate(e.movementX, e.movementY);
    }
}

/** Função que lida com o evento mousedown do mouse */
function mousedown_handler(e, refs, controle) {
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
        controle.line_tmp.set_color(...controle.cor);
        return;
    }
}

/** Função que lida com o evento mousedown do mouse */
function mouseup_handler(e, refs, controle) {
    // Finalização de desenho de linha
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

    // "Soltou" o mouse depois de arrastar objeto selecionado
    if (
        controle.ferramenta == "select"
        && controle.selected_obj != undefined
        && controle.arrastando == true
    ) {
        controle.arrastando = false;

        // Clareia hoverbox
        controle.hoverbox.set_claro();

        // Desmarca objeto como selecionado
        controle.selected_obj = undefined;
    }
}

/** Função que lida com o evento mousedown do mouse */
function click_handler(e, refs, controle) {
    // Não faz nada se o shift estiver pressionado
    if (e.shiftKey) { return; }

    const mouseX = controle.mouseX;
    const mouseY = controle.mouseY;
    const cor = controle.cor;

    // Desenha um ponto
    if (controle.ferramenta == "point" && !e.ctrlKey) {
        const p = new Point(mouseX, mouseY);
        p.set_color(...cor);
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
        polygon_tmp.set_color(...cor);

        // Cria uma linha temporária para a primeira aresta do polígono
        controle.polygon_first_line = new Line(mouseX, mouseY, mouseX, mouseY);
        controle.polygon_first_line.set_color(...cor);

        // Atualiza mensagem de status
        refs.msg.textContent = "Aperte ESC para finalizar o polígono ou \
            Ctrl+Clique para adicionar um último ponto";

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

    // Finaliza o polígono sendo desenhado se o usuário clicar segurando CTRL
    // (Mantém o vértice e finaliza, diferente de apertar ESC)
    if (
        controle.ferramenta == "polygon"
        && controle.polygon_tmp != undefined
        && e.ctrlKey
    ) {
        controle.polygon_tmp = undefined;
        refs.msg.textContent = "";
    }

    // Seleciona o objeto hovered
    if (
        controle.ferramenta == "select"
        && controle.hovered_obj != undefined
        && controle.selected_obj == undefined
    ) {
        // Escurece hoverbox
        controle.hoverbox.set_escuro();

        // Seta ele como selecionado de fato
        controle.selected_obj = controle.hovered_obj;

        // Habilita transformações
        if (!(controle.selected_obj instanceof Point)) {
            refs.slider_rot_div.hidden = false;
            refs.slider_esc_div.hidden = false;

            // Seta rotação com o valor atual do objeto
            refs.slider_rot.value = controle.selected_obj.rotation;
        }

    // Desseleciona o objeto
    } else if (
        controle.ferramenta == "select"
        && controle.hovered_obj != undefined
        && controle.selected_obj != undefined
        ) {
        // Clareia hoverbox
        controle.hoverbox.set_claro();

        // Desmarca como selecionado
        controle.selected_obj = undefined;

        // Desabilita transformações
        if (!(controle.selected_obj instanceof Point)) {
            refs.slider_rot_div.hidden = true;
            refs.slider_esc_div.hidden = true;
        }
    }

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
            finaliza_polygon(refs, controle);

            // Reseta controle
            reset_controles(refs, controle);
        }
    }

    // Configuração do botão de limpar
    refs.btn_limpar.onclick = () => {
        Point.list.length = 0;
        Line.list.length = 0;
        Polygon.list.length = 0;
        finaliza_polygon(refs, controle);
        reset_controles(refs, controle);
    }
}

/**
 * Função que inicializa o mouse handling
 * (Isola os eventos mousedown, mouseup e click)
 */
function init_mouse(refs, controle) {

    let is_down = false;
    let drag_hash;

    refs.canvas.onmousedown = (e) => {
        e.preventDefault();
        e.stopPropagation();

        drag_hash = 0;
        is_down = true;

        // console.log("mousedown");
        mousedown_handler(e, refs, controle);
    }

    refs.canvas.onmouseup = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (drag_hash < 5) {
            // console.log("click");
            click_handler(e, refs, controle);
        } else {
            // console.log("mouseup");
            mouseup_handler(e, refs, controle);
        }

        is_down = false;
    }

    refs.canvas.onmousemove = (e) => {
        e.preventDefault();
        e.stopPropagation();

        // console.log("mousemove");
        mousemove_handler(e, refs, controle);

        drag_hash += Math.abs(e.movementX) + Math.abs(e.movementY);

        if (is_down) {
            // console.log("mousedrag");
            mousedrag_handler(e, refs, controle);
        }
    }

    // Considera que o botão do mouse foi solto ao sair do canvas
    refs.canvas.onmouseleave = refs.canvas.onmouseup;
}

/** Função que inicializa keyboard handling */
function init_keyboard(refs, controle) {
    document.addEventListener ('keyup', (event) => {
        // Finaliza polígono pressionando ESC
        if (event.key == "Escape") {
            finaliza_polygon(refs, controle);
        }
    });
}

/** Função que inicializa os sliders de transformações */
function init_sliders(refs, controle) {
    refs.slider_rot.oninput = (e) => {
        const angulo = refs.slider_rot.value;
        if (
            controle.selected_obj != undefined
            && !(controle.selected_obj instanceof Point)
        ) {
            // Seta rotação
            controle.selected_obj.rotate(angulo);

            // Atualiza hoverbox
            const bbox = controle.selected_obj.boundingbox();
            hoverbox_params = [ bbox.xc, bbox.yc, bbox.w + 20, bbox.h + 20 ];
            controle.hoverbox.set_lines(...hoverbox_params);
        }
    }
}

/**
 * Função utilitária que gera números aleatórios baseados numa seed
 * Fonte: https://stackoverflow.com/a/19303725/1694726
 */
var seed = 1 // global
function random() {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
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
        "hoverbox": undefined,
        "hovered_obj": undefined,
        "selected_obj": undefined,
        "arrastando": false,
    }

    // Inicializa e configura funcionalidades
    init_cores(refs, controle);
    init_botoes(refs, controle);
    init_mouse(refs, controle);
    init_keyboard(refs, controle);
    init_sliders(refs, controle);

    // Esconde controles de rotação e escala
    refs.slider_rot_div.hidden = true;
    refs.slider_esc_div.hidden = true;

    window.requestAnimationFrame(() => draw_scene(gl, program, refs));
}

function draw_scene(gl, program, refs) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Ativa/Desativa debud de triângulos
    Polygon.debug_tri = refs.debug_tri.checked;

    // Desenha todos os polígonos, linhas, e pontos
    Polygon.draw();
    Line.draw();
    Point.draw();

    refs.ponto_count.textContent = `Pontos: ${Point.list.length}`;
    refs.linha_count.textContent = `Linhas: ${Line.list.length}`;
    refs.poligono_count.textContent = `Polígonos: ${Polygon.list.length}`;

    window.requestAnimationFrame(() => draw_scene(gl, program, refs));
}

window.onload = main;
