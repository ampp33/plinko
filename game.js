// Matter = require('matter-js')

const WALL_THICKENESS = 5

const OBJS_IN_BOTTOM_WIND_TUNNEL = []

const Engine = Matter.Engine,
        Render = Matter.Render,
        Runner = Matter.Runner,
        Body = Matter.Body,
        Bodies = Matter.Bodies,
        World = Matter.World,
        Composites = Matter.Composites

const engine = Engine.create()

const render = Render.create({
    element: document.body,
    engine,
    options: {
        height: 800,
        width: 800,
        wireframes: false
    }
})

function createRectViaTopLeftPoint(x, y, width, height, options) {
    return Bodies.rectangle(x + width / 2, y + height / 2, width, height, options)
}

function createWalls() {
    const options = {
        isStatic: true,
        render: {
            fillStyle: 'gray'
        }
    }
    return [
        createRectViaTopLeftPoint(0, 0, WALL_THICKENESS, render.canvas.height, options),
        createRectViaTopLeftPoint(0, 0, render.canvas.width, WALL_THICKENESS, options),
        createRectViaTopLeftPoint(0, render.canvas.height - WALL_THICKENESS, render.canvas.width, WALL_THICKENESS, options),
        createRectViaTopLeftPoint(render.canvas.width - WALL_THICKENESS, 0, WALL_THICKENESS, render.canvas.height, options),
    ]
}

// walls
World.add(engine.world, createWalls())
World.add(engine.world, createRectViaTopLeftPoint(
    render.canvas.width - 30,
    40,
    2,
    render.canvas.height - 80,
    {
        isStatic: true,
        render: {
            fillStyle: 'white'
        }
    }
))

// plinko pegs
const plinkoPegs = Composites.stack(
    WALL_THICKENESS + 10,
    WALL_THICKENESS + 400,
    16,
    16,
    30, 30, (x,y) => {
    return Bodies.circle(x, y, 10, {
        isStatic: true,
        render: {
            fillStyle: 'gray'
        }
    })
})

World.add(engine.world, plinkoPegs)

// balls
const balls = Composites.stack(30, 30, 20, 1, 18, 18, (x,y) => {
    return Bodies.circle(x, y, 5, { frictionAir: 0.02, restitution: 1 })
})
const biggerBalls = Composites.stack(30, 50, 20, 1, 18, 18, (x,y) => {
    return Bodies.circle(x, y, 8, { frictionAir: 0.02, restitution: 1 })
})

World.add(engine.world, [balls, biggerBalls])

// add wind tunnels!
const bottomWindTunnel = createRectViaTopLeftPoint(
    WALL_THICKENESS,
    render.canvas.height - (20 + WALL_THICKENESS),
    render.canvas.width - WALL_THICKENESS * 2,
    20,
    {
        isStatic: true,
        isSensor: true,
        render: {
            fillStyle: 'purple',
            opacity: .25
        }
    }
)
World.add(engine.world, bottomWindTunnel)

function handleCollisionChange(e, isStart) {
    for(const pair of e.pairs) {
        const {bodyA, bodyB} = pair
        const windTunnel =
            bodyA == bottomWindTunnel ? bodyA
                : bodyB == bottomWindTunnel ? bodyB : null
        const otherObj = windTunnel == bodyA ? bodyB : bodyA

        if(!windTunnel) return

        if(isStart) OBJS_IN_BOTTOM_WIND_TUNNEL.push(otherObj)
        else OBJS_IN_BOTTOM_WIND_TUNNEL.splice(OBJS_IN_BOTTOM_WIND_TUNNEL.indexOf(otherObj), 1)
    }
}

Matter.Events.on(engine, 'collisionStart', (e) => {
    handleCollisionChange(e, true)
})

Matter.Events.on(engine, 'collisionEnd', (e) => {
    handleCollisionChange(e, false)
})

Matter.Events.on(engine, 'beforeUpdate', (e) => {
    for(const objInBottomWindTunnel of OBJS_IN_BOTTOM_WIND_TUNNEL) {
        Body.applyForce(objInBottomWindTunnel, {
            x: objInBottomWindTunnel.position.x,
            y: objInBottomWindTunnel.position.y
        }, {
            x: 0.0001, y: 0
        })
    }
})

engine.gravity.scale = 0.0005

// add all of the bodies to the world
// World.add(engine.world, [boxA, boxB])
// World.add(engine.world, [ground])

// setInterval(() => {
//     World.add(engine.world, [ Bodies.rectangle(400, 200, 80, 80) ])
// }, 1000)

// run the renderer
Render.run(render)

// create runner
var runner = Runner.create()

// run the engine
Runner.run(runner, engine)