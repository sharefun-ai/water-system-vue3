import test from 'node:test'
import assert from 'node:assert/strict'
import {createDataSourceConfig,requireDataSource,UNCONNECTED_MESSAGE} from '../src/data/dataSource.js'
test('local PHP paths remain available',()=>{assert.equal(createDataSourceConfig({DEV:true}).apiRoot,'/backend');const local=createDataSourceConfig();assert.equal(local.apiRoot,'/'+encodeURIComponent('水系統3.0')+'/backend');assert.doesNotThrow(()=>requireDataSource(local))})
test('public interface does not request the inaccessible local data service',()=>{const cloud=createDataSourceConfig({VITE_PUBLIC_SITE:'true'});assert.equal(cloud.unavailable,true);assert.throws(()=>requireDataSource(cloud),{message:UNCONNECTED_MESSAGE})})
test('authorized HTTPS or same-origin API is configurable',()=>{for(const api of ['https://data.example.org/api/','/api/']){const cloud=createDataSourceConfig({VITE_PUBLIC_SITE:'true',VITE_API_ROOT:api});assert.equal(cloud.apiRoot,api.slice(0,-1));assert.doesNotThrow(()=>requireDataSource(cloud))}assert.throws(()=>createDataSourceConfig({VITE_API_ROOT:'http://127.0.0.1:8080/backend'}))})
