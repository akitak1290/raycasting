const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const FOVelement = document.getElementById("slider");

const lightRayCnt = 90;
const step = 3; // for moving the light source
let FOV = FOVelement.value;
let center = { x: ctx.canvas.width / 2, y: ctx.canvas.height / 2 }
const mouse = {
    x: canvas.width/2,
    y: canvas.height/2
}
const map = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,1,1,0,0,0,1,0,0,0,0,0,1,0,1],
    [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1],
    [1,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
] //20x10
const shapes = genMap(canvas.width, canvas.height, 20, 10, map);

/*
    Return pregenerated simple tile-based maze of 20x10 tiles
    Param: 
        width: width of the map
        eight: height of the map
        col: the number of colums
        row: the number of rows
        map: the predetermined layout
    Return:
        A 3d array of coordinates for vertecies
        [
            [{x: .., y: ..}, {x: .., y: ..},..],
            [..],
            ..
        ]
*/
function genMap(width, height, col, row, map) {
    const tileW = width / col;
    const tileH = height / row;
    let allVertices = [];
    let tileVertices = [];
    // get vertices' coordinate for each 'filled' tile
    for (let i = 0; i < map.length; i++){
        for (let j = 0; j < map[i].length; j++){
            if (map[i][j]){
                const x = (j) * tileW;
                const y = (i) * tileH;
                tileVertices = [];
                tileVertices.push({x: x, y: y});
                tileVertices.push({x: x + tileW, y: y});
                tileVertices.push({x: x + tileW, y: y + tileH});
                tileVertices.push({x: x , y: y + tileH});
                allVertices.push(tileVertices);
            }
        }
    }
    return allVertices;
}

/*
    Handle collision for rays and lines/walls
    Param:
        r: ray of  [{x: r_x, y: r_y}, {x: r_x1, y: r_y1}]
        l: line of [{x: l_x, y: l_y}, {y: l_x1, y: l_x1}]
                    initial            terminal
    Return:
        either
        a point of {x: .., y: ..} where r and l intersect
        or
        null if no such point is found
*/
function getIntersection(r, l) {
    // find directional vectors
    const r_v = { x: r[1].x - r[0].x, y: r[1].y - r[0].y };
    const l_v = { x: l[1].x - l[0].x, y: l[1].y - l[0].y };

    // check if they are parallel
    const r_m = Math.sqrt(r_v.x * r_v.x + r_v.y * r_v.y);
    const l_m = Math.sqrt(l_v.x * l_v.x + l_v.y * l_v.y);
    if (r_v.x / r_m == l_v.x / l_m && r_v.y / r_m == l_v.y / l_m) {
        return null
    }

    // solve for scalar t1, t2 in r = r0 + tv
    // r_x1 = r_x + t1.r_v_x
    // r_y1 = r_y + t1.r_v_y
    // l_x1 = l_x + t2.l_v_x
    // l_y1 = l_y + t2.l_v_y

    // if the ray and line intersect, the terminal
    // point for r and l is the same

    // solve for T2
    const T2 = (r_v.x * (l[0].y - r[0].y) + r_v.y * (r[0].x - l[0].x))
        / (l_v.x * r_v.y - l_v.y * r_v.x)

    // solve for T1
    const T1 = (l[0].x + l_v.x * T2 - r[0].x) / r_v.x

    // make sure that the point is on the line segment
    if (T1 < 0) {
        return null;
    }
    if (T2 < 0 || T2 > 1) {
        return null
    };

    // plug back in to get intersection point
    return { x: r[0].x + T1 * r_v.x, y: r[0].y + T1 * r_v.y, scalar: T1 }
}
/*
    Create a new point by rotating the original
    point {x, y} by angle to central point {cx, cy}
    Use to generate a light ray
    Param:
        cx: x coordinate of central point
        cy: y coordinate of central point
        x: x coordinate of the point to be rotated
        y: y coordinate of the point to be rotated
        angle: angle in degree
    Return:
        The new position of the point {x: .., y: ..}
        after the rotation
*/
function genPoints(cx, cy, x, y, angle) {
    const rad = angle * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const nx = (cos * (x - cx)) + (sin * (y - cy)) + cx;
    const ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;
    return { x: Math.floor(nx), y: Math.floor(ny) };
}

function draw() {
    // clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'white';

    // draw walls
    for (var i = 0; i < shapes.length; i++) { //for shape in array
        ctx.beginPath();
        ctx.moveTo(shapes[i][0].x, shapes[i][0].y);
        for (var j = 1; j < shapes[i].length; j++) { //for vertex in shape
            ctx.lineTo(shapes[i][j].x, shapes[i][j].y); //x, y
        }
        ctx.closePath();
        ctx.strokeStyle = "yellow";
        // ctx.fill();
        ctx.stroke();   
    }

    // generate a light cone and
    // for each light ray,
    // find collision for ray and walls
    for (let i = 0; i < lightRayCnt; i++) {
        // ray = [{ x: Mouse.x, y: Mouse.y }, genPoints(Mouse.x, Mouse.y, i * 360 / lightRayCnt, 10)];
        ray = [
            {
                x: center.x,
                y: center.y
            },
            genPoints(center.x, center.y, mouse.x, mouse.y, i * FOV / lightRayCnt - FOV / 2)
        ];

        // find closest intersection
        let closestIntersect = null;
        let intersect = null;
        for (let i = 0; i < shapes.length; i++) { // for each shape
            for (let j = 0; j < shapes[i].length; j++) { // for each wall in shape
                intersect = getIntersection(ray, [shapes[i][j], shapes[i][(j + 1) % shapes[i].length]]);
                if (intersect) {
                    if (!closestIntersect || intersect.scalar < closestIntersect.scalar) {
                        closestIntersect = intersect;
                    }
                }
            }
        }

        // draw truncated ray from mouse to nearest wall
        if (closestIntersect != null) {
            ctx.strokeStyle = "white";
            ctx.beginPath();
            ctx.moveTo(center.x, center.y);
            ctx.lineTo(closestIntersect.x, closestIntersect.y);
            ctx.stroke();
        }
    }
}

//################### DRAW ##############################################################
window.requestAnimationFrame = window.requestAnimationFrame
    || window.webkitRequestAnimationFrame
    || window.mozRequestAnimationFrame
    || window.msRequestAnimationFrame;
let updateCanvas = true;
function drawLoop() {
    requestAnimationFrame(drawLoop);
    if (updateCanvas) {
        draw();
        updateCanvas = false;
    }
}
window.onload = function () {
    drawLoop();
};

canvas.onmousemove = function (event) {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    updateCanvas = true;
};
canvas.onkeydown = function (event) {
    switch (event.code) {
        case "KeyW":
            center.y -= step;
            updateCanvas = true;
            break;
        case "KeyS":
            center.y += step;
            updateCanvas = true;
            break;
        case "KeyA":
            center.x -= step;
            updateCanvas = true;
            break;
        case "KeyD":
            center.x += step;
            updateCanvas = true;
            break;
        default:
        //ignore
    }
}
FOVelement.oninput = function (event) {
    FOV = event.target.value;
    updateCanvas = true;
}

//################### Unused ############################################################

// Create a new point by rotating the original
// point {x, y} clockwise by @ngle to length
// function genPoints(x, y, angle, length) {
//   angle = angle * Math.PI / 180; // degree to radians
//   return { x: (length * Math.cos(angle) + x).toFixed(2), y: (length * Math.sin(angle) + y).toFixed(2) }
// }

// Flip state of a tile on click event
// let m = { x: 0, y: 0 }
// canvas.onclick = function (event) {
//     const mx = event.clientX;
//     const my = event.clientY;
//     // flip tile's state
//     const tile = { x: Math.floor(mx / tileW), y: Math.floor(my / tileH) };
//     map[tile.y][tile.x] = map[tile.y][tile.x] ? 0 : 1;
//     m.x = mx;
//     m.y = my;
// }