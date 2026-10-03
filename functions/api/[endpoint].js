import {handleSimulationRequest} from '../../server/simulation.js'
export const onRequest=({request,params})=>handleSimulationRequest(request,params.endpoint)
