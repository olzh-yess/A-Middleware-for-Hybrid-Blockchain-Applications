import fs from 'fs';
import path from 'path';

export const readJSON = (pathToJSON: string) => {
    let rawData = fs.readFileSync(path.join(__dirname, pathToJSON));
    let jsonData = JSON.parse(rawData.toString());
    
    return jsonData;    
}
