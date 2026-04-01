import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const openapiPath = path.resolve(__dirname, '../openapi.yaml');
const swaggerSpec = yaml.load(fs.readFileSync(openapiPath, 'utf8')) as object;

export default swaggerSpec;
