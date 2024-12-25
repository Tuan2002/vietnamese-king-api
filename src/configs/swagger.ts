import "dotenv/config";
import swaggerJSDoc from "swagger-jsdoc";

const swaggerSpecs = {
    definition: {
        openapi: "3.1.0",
        info: {
            title: "Vietnamese King API",
            version: "1.0.0",
            description:
                "Vietnamese King API is a RESTful API for Vua Tiếng Việt Game",
            license: {
                name: "MIT",
                url: "https://spdx.org/licenses/MIT.html",
            },
        },
        servers: [
            {
                url: `${process.env.BASE_URL}:${process.env.APP_PORT}/api/`,
            },
        ],
    },
    apis: ["./src/controllers/**/*.*s", "./src/models/**/*.*s",],
};

const options = {
    customSiteTitle: "Vietnamese King API",
};

const specs = swaggerJSDoc(swaggerSpecs);
export { options, specs };

