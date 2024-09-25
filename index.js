//================================================================
//#region Consts

const objectRadius = 16;
const objectRadiusSquared = objectRadius * objectRadius;

const lineMaxIterations = 100;
const lineMinRange = 0.001;

//#endregion

//================================================================
//#region Rope

const CalculateLength = (d_x, d_y, a) => {
    const r = d_y / d_x;
    const r2 = r / (2.0 * a);
    const d_x2 = d_x / 2.0;
    const x2 = 4.0 * Math.pow(a, 2.0);
    return (
        ( Math.asinh(r + d_x * a) - Math.asinh(r - d_x * a) ) / (4.0 * a)
        +
        0.5 * (
            (r2 + d_x2) * Math.sqrt(1.0 + x2 * Math.pow(r2 + d_x2, 2))
            -
            (r2 - d_x2) * Math.sqrt(1.0 + x2 * Math.pow(r2 - d_x2, 2))
        )
    );
};

const EstimateA = (d_x, d_y, l, i, range) => {
    //estimation
    let x;
    let r;
    let b1 = 0.0;
    let b2 = 1.0;
    //calc second boundry
    do{
        r = CalculateLength(d_x, d_y, b2);
        if(l < r)
            break;
        b2 *= 2.0;
    }while(1);
    //guess in the middle
    do{
        //calc
        x = (b1 + b2) / 2.0;
        r = CalculateLength(d_x, d_y, x);
        //check win
        if(Math.abs(r - l) < range)
            return x;
        //further
        if(r < l)
            b1 = x;
        else
            b2 = x;
    }while(i--);
    //end it
    return x;
};

const CalculateP = (d_x, d_y, a) => {
    return 0.5 * ( d_y / (a * d_x) - d_x );
};

//#endregion

//================================================================
//#region Rendering

let ctx = null;
let canvas = null;

const objects = [
    {
        x: 100
        ,y: 300
        ,color: "blue" 
    }
    ,{
        x: 200
        ,y: 200
        ,color: "red"
    }
];

const DrawCircle = (x, y, r, color) => {
    // Draw a circle
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2); // Full circle (0 to 2π radians)
    ctx.fillStyle = color; // Fill color
    ctx.fill();  // Fill the circle
    ctx.lineWidth = 1;           // Border width
    ctx.strokeStyle = color;    // Border color
};

const DrawAXSquared = (a, p, q, x1, x2) => {
    let r = 0;

    if(x1 > x2){
        r = x2;
        x2 = x1;
        x1 = r;
    }

    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.lineCap = "round"; // Smooth edges for drawing
    ctx.beginPath();

    while(x1 <= x2){
        //calc
        r = a * x1 * x1;
        //draw
        ctx.lineTo(p + (x2 - x1), q - r);
        ctx.stroke();
        //next
        x1 += 1;
        
    }
    ctx.beginPath();
};

const DrawLine = (x1, y1, x2, y2) => {
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.lineCap = "round"; // Smooth edges for drawing
    ctx.beginPath();
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
};

const DrawRope = (x1, y1, x2, y2, l) => {
    let d_x = x2 - x1;
    let d_y = y2 - y1;
    //check for too short length
    const d = Math.sqrt(d_x * d_x + d_y * d_y);
    if(d > l){
        const r = l / d;
        DrawLine(x1, y1, x1 + d_x * r, y1 + d_y * r);
        return;
    }
    //d_x = 0 case
    if(!d_x){
        const r = (l - d) * 0.5;
        const c2 = (y1 < y2) ? 1 : 0;
        DrawLine(x1, y1 + r * !c2, x1, y2 + r * c2);
        return;
    }

    //draw more advanced shit
    d_x = Math.abs(d_x);
    d_y = Math.abs(d_y);    
    const a = EstimateA(d_x, d_y, l, lineMaxIterations, lineMinRange);
    const p = CalculateP(d_x, d_y, a);// * (((x2 > x1) ^ (y1 > y2)) ? 1 : -1);
    const c1 = ((x2 > x1) ^ (y1 > y2)) ? 1 : -1;


    //draw complex line
    //=============ABS

    // b
    //  r
    //DrawAXSquared(a, x1, y1 + a*p*p + d_y, p, p + d_x);

    //  r
    // b
    //DrawAXSquared(a, x1, y1 + a*p*p, -p, -p - d_x);
    
    //  r
    //   b
    //DrawAXSquared(a, x1-d_x, y1 + a*p*p, p, p + d_x);

    //   b
    //  r
    //DrawAXSquared(a, x1 - d_x, y1 + a*p*p + d_y, -p, -p - d_x );


    DrawAXSquared(a,
        x1 - ((x2 < x1) ? d_x : 0)
        , y1 + a*p*p + ((y1 < y2) ? d_y : 0)
        , p * c1
        , (p + d_x) * c1
    );

};

const Render = () => {
    //clear screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    //render points
    objects.forEach( o => {
        DrawCircle(o.x, o.y, objectRadius, o.color);
    });
    //render the rope
    DrawRope(objects[0].x, objects[0].y, objects[1].x, objects[1].y, slider1.value);
};

//#endregion

//================================================================
//#region Events

let selectedObject = null;

const onClickStart = e => {
    //find object to drag
    let i = objects.length;
    let x = e.clientX - canvas.offsetLeft;
    let y = e.clientY - canvas.offsetTop;
    let dx = 0;
    let dy = 0;
    while(i--){
        selectedObject = objects[i];
        dx = x - selectedObject.x;
        dy = y - selectedObject.y;
        //check distance
        if(dx * dx + dy * dy <= objectRadiusSquared)
            //selected this object to move
            return;
    }
    selectedObject = null;
};

const onMouseMove = e => {
    if(selectedObject){
        selectedObject.x = e.clientX - canvas.offsetLeft;
        selectedObject.y = e.clientY - canvas.offsetTop;
        Render();
    }
};

const onClickEnd = e => {
    selectedObject = null;
};

let slider1 = null;
let text1 = null;
const onSliderChange = e => {
    text1.textContent = slider1.value;
    Render();
};

//#endregion

//================================================================
//#region Startup

window.onload = () => {
    canvas = document.getElementById("view");
    ctx = canvas.getContext("2d");

    // Set the canvas size dynamically
    canvas.width = window.innerWidth * 0.8;
    canvas.height = window.innerHeight * 0.8;

    // Event listeners for mouse actions
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onClickStart);
    canvas.addEventListener("mouseup", onClickEnd);
    
    //slider1
    text1 = document.getElementById("text1");
    slider1 = document.getElementById("slider1");
    slider1.addEventListener("input", onSliderChange);
    
    //rest
    Render();


    /*
    // Create an Image object
    const img = new Image();
    
    // Set the image source (URL of the image)
    img.src = 'https://via.placeholder.com/500'; // Example placeholder image
    
    // Once the image is loaded, draw it onto the canvas
    img.onload = function () {
        // Draw the image at position (0, 0) and with its original size
        ctx.drawImage(img, 0, 0);

        // Optionally, scale the image
        // ctx.drawImage(img, 0, 0, 400, 300); // Draw image with custom size
    };
    */
};

//#endregion
