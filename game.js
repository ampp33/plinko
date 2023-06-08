// Matter = require('matter-js')

const COLLISION_ACTIVE_HANDLERS = []
const COLLISION_START_HANDLERS = []
const WALL_THICKENESS = 5

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
        height: 1000,
        width: 1000,
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

function addBalls() {
    return Composites.stack(30, 30, 20, 1, 18, 18, (x,y) => {
        return Bodies.circle(x, y, 5.5, { frictionAir: 0.02, restitution: 1 })
    })
}

function getObjsColliding(label) {
    return (e) => {
        return e.pairs
            .filter((pair) => pair.bodyA.label === label || pair.bodyB.label === label)
            .map((pair) => {
                const {bodyA, bodyB} = pair
                return bodyA.label === label ? bodyB : bodyA
            })
    }
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

// gates
// x 865 y 765
World.add(engine.world, createRectViaTopLeftPoint(
    565, 660, 40, 10,
    {
        isStatic: true,
        isSensor: true,
        render: {
            fillStyle: 'orange',
            opacity: 0.5
        },
        label: 'orangeGate'
    }
))
COLLISION_START_HANDLERS.push((e) => {
    if(getObjsColliding('orangeGate')(e).length > 0) {
        World.add(engine.world, addBalls())
    }
})

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
World.add(engine.world, addBalls())

// add wind tunnels
const windTunnelOptions = {
    isStatic: true,
    isSensor: true,
    render: {
        fillStyle: 'purple',
        opacity: .25
    }
}

const windTunnels = [
    {
        objsInTunnel: [],
        force: { x: -0.00006, y: 0 },
        tunnel: createRectViaTopLeftPoint(
            WALL_THICKENESS,
            WALL_THICKENESS,
            render.canvas.width - WALL_THICKENESS * 2,
            20,
            {
                ...windTunnelOptions,
                label: "topWindTunnel"
            }
        )
    },
    {
        objsInTunnel: [],
        force: { x: 0.00006, y: 0 },
        tunnel: createRectViaTopLeftPoint(
            WALL_THICKENESS,
            render.canvas.height - (20 + WALL_THICKENESS),
            render.canvas.width - WALL_THICKENESS * 2,
            20,
            {
                ...windTunnelOptions,
                label: "bottomWindTunnel"
            }
        )
    },
    {
        objsInTunnel: [],
        force: { x: 0, y: -0.00008 },
        tunnel: createRectViaTopLeftPoint(
            render.canvas.width - WALL_THICKENESS - 20,
            WALL_THICKENESS,
            20,
            render.canvas.height - WALL_THICKENESS * 2,
            {
                ...windTunnelOptions,
                label: "rightWindTunnel"
            }
        )
    }
]

COLLISION_ACTIVE_HANDLERS.push((e) => {
    for(const wt of windTunnels) {
        wt.objsInTunnel =
            e.pairs.filter((pair) => pair.bodyA.label === wt.tunnel.label || pair.bodyB.label === wt.tunnel.label)
                    .map((pair) => {
                        const {bodyA, bodyB} = pair
                        return bodyA.label === wt.tunnel.label ? bodyB : bodyA
                    })
    }
})

World.add(engine.world, windTunnels.map((wt) => wt.tunnel))

Matter.Events.on(engine, 'collisionActive', (e) => {
    for(const handler of COLLISION_ACTIVE_HANDLERS) {
        handler(e)
    }
})

Matter.Events.on(engine, 'collisionStart', (e) => {
    for(const handler of COLLISION_START_HANDLERS) {
        handler(e)
    }
})

Matter.Events.on(engine, 'beforeUpdate', (e) => {
    for(const wt of windTunnels) {
        for(const obj of wt.objsInTunnel) {
            Body.applyForce(obj, {
                x: obj.position.x,
                y: obj.position.y
            },
            wt.force)
        }
    }
})

engine.gravity.scale = 0.0005

// run the renderer
Render.run(render)

// create runner
var runner = Runner.create()

// run the engine
Runner.run(runner, engine)
