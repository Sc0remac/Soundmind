"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/music/list/route";
exports.ids = ["app/api/music/list/route"];
exports.modules = {

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

module.exports = require("https");

/***/ }),

/***/ "punycode":
/*!***************************!*\
  !*** external "punycode" ***!
  \***************************/
/***/ ((module) => {

module.exports = require("punycode");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("stream");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

module.exports = require("url");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("zlib");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fmusic%2Flist%2Froute&page=%2Fapi%2Fmusic%2Flist%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fmusic%2Flist%2Froute.ts&appDir=%2FUsers%2Fcormackerr%2FDesktop%2Fsoundmind%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fcormackerr%2FDesktop%2Fsoundmind&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!******************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fmusic%2Flist%2Froute&page=%2Fapi%2Fmusic%2Flist%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fmusic%2Flist%2Froute.ts&appDir=%2FUsers%2Fcormackerr%2FDesktop%2Fsoundmind%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fcormackerr%2FDesktop%2Fsoundmind&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \******************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   originalPathname: () => (/* binding */ originalPathname),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ \"(rsc)/./node_modules/next/dist/server/future/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_cormackerr_Desktop_soundmind_app_api_music_list_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/music/list/route.ts */ \"(rsc)/./app/api/music/list/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/music/list/route\",\n        pathname: \"/api/music/list\",\n        filename: \"route\",\n        bundlePath: \"app/api/music/list/route\"\n    },\n    resolvedPagePath: \"/Users/cormackerr/Desktop/soundmind/app/api/music/list/route.ts\",\n    nextConfigOutput,\n    userland: _Users_cormackerr_Desktop_soundmind_app_api_music_list_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks } = routeModule;\nconst originalPathname = \"/api/music/list/route\";\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        serverHooks,\n        staticGenerationAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIuanM/bmFtZT1hcHAlMkZhcGklMkZtdXNpYyUyRmxpc3QlMkZyb3V0ZSZwYWdlPSUyRmFwaSUyRm11c2ljJTJGbGlzdCUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFwaSUyRm11c2ljJTJGbGlzdCUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRmNvcm1hY2tlcnIlMkZEZXNrdG9wJTJGc291bmRtaW5kJTJGYXBwJnBhZ2VFeHRlbnNpb25zPXRzeCZwYWdlRXh0ZW5zaW9ucz10cyZwYWdlRXh0ZW5zaW9ucz1qc3gmcGFnZUV4dGVuc2lvbnM9anMmcm9vdERpcj0lMkZVc2VycyUyRmNvcm1hY2tlcnIlMkZEZXNrdG9wJTJGc291bmRtaW5kJmlzRGV2PXRydWUmdHNjb25maWdQYXRoPXRzY29uZmlnLmpzb24mYmFzZVBhdGg9JmFzc2V0UHJlZml4PSZuZXh0Q29uZmlnT3V0cHV0PSZwcmVmZXJyZWRSZWdpb249Jm1pZGRsZXdhcmVDb25maWc9ZTMwJTNEISIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBc0c7QUFDdkM7QUFDYztBQUNlO0FBQzVGO0FBQ0E7QUFDQTtBQUNBLHdCQUF3QixnSEFBbUI7QUFDM0M7QUFDQSxjQUFjLHlFQUFTO0FBQ3ZCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQSxZQUFZO0FBQ1osQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBLFFBQVEsaUVBQWlFO0FBQ3pFO0FBQ0E7QUFDQSxXQUFXLDRFQUFXO0FBQ3RCO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDdUg7O0FBRXZIIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vc291bmRtaW5kLz8yNTRkIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcFJvdXRlUm91dGVNb2R1bGUgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9mdXR1cmUvcm91dGUtbW9kdWxlcy9hcHAtcm91dGUvbW9kdWxlLmNvbXBpbGVkXCI7XG5pbXBvcnQgeyBSb3V0ZUtpbmQgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9mdXR1cmUvcm91dGUta2luZFwiO1xuaW1wb3J0IHsgcGF0Y2hGZXRjaCBhcyBfcGF0Y2hGZXRjaCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi9wYXRjaC1mZXRjaFwiO1xuaW1wb3J0ICogYXMgdXNlcmxhbmQgZnJvbSBcIi9Vc2Vycy9jb3JtYWNrZXJyL0Rlc2t0b3Avc291bmRtaW5kL2FwcC9hcGkvbXVzaWMvbGlzdC9yb3V0ZS50c1wiO1xuLy8gV2UgaW5qZWN0IHRoZSBuZXh0Q29uZmlnT3V0cHV0IGhlcmUgc28gdGhhdCB3ZSBjYW4gdXNlIHRoZW0gaW4gdGhlIHJvdXRlXG4vLyBtb2R1bGUuXG5jb25zdCBuZXh0Q29uZmlnT3V0cHV0ID0gXCJcIlxuY29uc3Qgcm91dGVNb2R1bGUgPSBuZXcgQXBwUm91dGVSb3V0ZU1vZHVsZSh7XG4gICAgZGVmaW5pdGlvbjoge1xuICAgICAgICBraW5kOiBSb3V0ZUtpbmQuQVBQX1JPVVRFLFxuICAgICAgICBwYWdlOiBcIi9hcGkvbXVzaWMvbGlzdC9yb3V0ZVwiLFxuICAgICAgICBwYXRobmFtZTogXCIvYXBpL211c2ljL2xpc3RcIixcbiAgICAgICAgZmlsZW5hbWU6IFwicm91dGVcIixcbiAgICAgICAgYnVuZGxlUGF0aDogXCJhcHAvYXBpL211c2ljL2xpc3Qvcm91dGVcIlxuICAgIH0sXG4gICAgcmVzb2x2ZWRQYWdlUGF0aDogXCIvVXNlcnMvY29ybWFja2Vyci9EZXNrdG9wL3NvdW5kbWluZC9hcHAvYXBpL211c2ljL2xpc3Qvcm91dGUudHNcIixcbiAgICBuZXh0Q29uZmlnT3V0cHV0LFxuICAgIHVzZXJsYW5kXG59KTtcbi8vIFB1bGwgb3V0IHRoZSBleHBvcnRzIHRoYXQgd2UgbmVlZCB0byBleHBvc2UgZnJvbSB0aGUgbW9kdWxlLiBUaGlzIHNob3VsZFxuLy8gYmUgZWxpbWluYXRlZCB3aGVuIHdlJ3ZlIG1vdmVkIHRoZSBvdGhlciByb3V0ZXMgdG8gdGhlIG5ldyBmb3JtYXQuIFRoZXNlXG4vLyBhcmUgdXNlZCB0byBob29rIGludG8gdGhlIHJvdXRlLlxuY29uc3QgeyByZXF1ZXN0QXN5bmNTdG9yYWdlLCBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcyB9ID0gcm91dGVNb2R1bGU7XG5jb25zdCBvcmlnaW5hbFBhdGhuYW1lID0gXCIvYXBpL211c2ljL2xpc3Qvcm91dGVcIjtcbmZ1bmN0aW9uIHBhdGNoRmV0Y2goKSB7XG4gICAgcmV0dXJuIF9wYXRjaEZldGNoKHtcbiAgICAgICAgc2VydmVySG9va3MsXG4gICAgICAgIHN0YXRpY0dlbmVyYXRpb25Bc3luY1N0b3JhZ2VcbiAgICB9KTtcbn1cbmV4cG9ydCB7IHJvdXRlTW9kdWxlLCByZXF1ZXN0QXN5bmNTdG9yYWdlLCBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcywgb3JpZ2luYWxQYXRobmFtZSwgcGF0Y2hGZXRjaCwgIH07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFwcC1yb3V0ZS5qcy5tYXAiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fmusic%2Flist%2Froute&page=%2Fapi%2Fmusic%2Flist%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fmusic%2Flist%2Froute.ts&appDir=%2FUsers%2Fcormackerr%2FDesktop%2Fsoundmind%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fcormackerr%2FDesktop%2Fsoundmind&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./app/api/music/list/route.ts":
/*!*************************************!*\
  !*** ./app/api/music/list/route.ts ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ GET)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n/* harmony import */ var _lib_auth__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/lib/auth */ \"(rsc)/./lib/auth.ts\");\n// app/api/music/list/route.ts\n\n\nasync function GET(req) {\n    try {\n        const user = await (0,_lib_auth__WEBPACK_IMPORTED_MODULE_1__.requireUserFromRequest)(req);\n        const { supa } = (0,_lib_auth__WEBPACK_IMPORTED_MODULE_1__.supabaseFromRequest)(req);\n        // Use view if present, else join at runtime\n        const { data: rows, error } = await supa.from(\"v_spotify_listens_expanded\").select(\"*\").eq(\"user_id\", user.id).order(\"played_at\", {\n            ascending: false\n        }).limit(300);\n        if (error) throw new Error(error.message);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            rows: rows ?? []\n        });\n    } catch (e) {\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: e?.message || String(e)\n        }, {\n            status: 401\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL211c2ljL2xpc3Qvcm91dGUudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsOEJBQThCO0FBQ2E7QUFDOEI7QUFFbEUsZUFBZUcsSUFBSUMsR0FBWTtJQUNwQyxJQUFJO1FBQ0YsTUFBTUMsT0FBTyxNQUFNSixpRUFBc0JBLENBQUNHO1FBQzFDLE1BQU0sRUFBRUUsSUFBSSxFQUFFLEdBQUdKLDhEQUFtQkEsQ0FBQ0U7UUFFckMsNENBQTRDO1FBQzVDLE1BQU0sRUFBRUcsTUFBTUMsSUFBSSxFQUFFQyxLQUFLLEVBQUUsR0FBRyxNQUFNSCxLQUNqQ0ksSUFBSSxDQUFDLDhCQUNMQyxNQUFNLENBQUMsS0FDUEMsRUFBRSxDQUFDLFdBQVdQLEtBQUtRLEVBQUUsRUFDckJDLEtBQUssQ0FBQyxhQUFhO1lBQUVDLFdBQVc7UUFBTSxHQUN0Q0MsS0FBSyxDQUFDO1FBRVQsSUFBSVAsT0FBTyxNQUFNLElBQUlRLE1BQU1SLE1BQU1TLE9BQU87UUFDeEMsT0FBT2xCLHFEQUFZQSxDQUFDbUIsSUFBSSxDQUFDO1lBQUVYLE1BQU1BLFFBQVEsRUFBRTtRQUFDO0lBQzlDLEVBQUUsT0FBT1ksR0FBUTtRQUNmLE9BQU9wQixxREFBWUEsQ0FBQ21CLElBQUksQ0FBQztZQUFFVixPQUFPVyxHQUFHRixXQUFXRyxPQUFPRDtRQUFHLEdBQUc7WUFBRUUsUUFBUTtRQUFJO0lBQzdFO0FBQ0YiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9zb3VuZG1pbmQvLi9hcHAvYXBpL211c2ljL2xpc3Qvcm91dGUudHM/MzY1YSJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBhcHAvYXBpL211c2ljL2xpc3Qvcm91dGUudHNcbmltcG9ydCB7IE5leHRSZXNwb25zZSB9IGZyb20gXCJuZXh0L3NlcnZlclwiO1xuaW1wb3J0IHsgcmVxdWlyZVVzZXJGcm9tUmVxdWVzdCwgc3VwYWJhc2VGcm9tUmVxdWVzdCB9IGZyb20gXCJAL2xpYi9hdXRoXCI7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBHRVQocmVxOiBSZXF1ZXN0KSB7XG4gIHRyeSB7XG4gICAgY29uc3QgdXNlciA9IGF3YWl0IHJlcXVpcmVVc2VyRnJvbVJlcXVlc3QocmVxKTtcbiAgICBjb25zdCB7IHN1cGEgfSA9IHN1cGFiYXNlRnJvbVJlcXVlc3QocmVxKTtcblxuICAgIC8vIFVzZSB2aWV3IGlmIHByZXNlbnQsIGVsc2Ugam9pbiBhdCBydW50aW1lXG4gICAgY29uc3QgeyBkYXRhOiByb3dzLCBlcnJvciB9ID0gYXdhaXQgc3VwYVxuICAgICAgLmZyb20oXCJ2X3Nwb3RpZnlfbGlzdGVuc19leHBhbmRlZFwiKVxuICAgICAgLnNlbGVjdChcIipcIilcbiAgICAgIC5lcShcInVzZXJfaWRcIiwgdXNlci5pZClcbiAgICAgIC5vcmRlcihcInBsYXllZF9hdFwiLCB7IGFzY2VuZGluZzogZmFsc2UgfSlcbiAgICAgIC5saW1pdCgzMDApO1xuXG4gICAgaWYgKGVycm9yKSB0aHJvdyBuZXcgRXJyb3IoZXJyb3IubWVzc2FnZSk7XG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgcm93czogcm93cyA/PyBbXSB9KTtcbiAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgZXJyb3I6IGU/Lm1lc3NhZ2UgfHwgU3RyaW5nKGUpIH0sIHsgc3RhdHVzOiA0MDEgfSk7XG4gIH1cbn1cbiJdLCJuYW1lcyI6WyJOZXh0UmVzcG9uc2UiLCJyZXF1aXJlVXNlckZyb21SZXF1ZXN0Iiwic3VwYWJhc2VGcm9tUmVxdWVzdCIsIkdFVCIsInJlcSIsInVzZXIiLCJzdXBhIiwiZGF0YSIsInJvd3MiLCJlcnJvciIsImZyb20iLCJzZWxlY3QiLCJlcSIsImlkIiwib3JkZXIiLCJhc2NlbmRpbmciLCJsaW1pdCIsIkVycm9yIiwibWVzc2FnZSIsImpzb24iLCJlIiwiU3RyaW5nIiwic3RhdHVzIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./app/api/music/list/route.ts\n");

/***/ }),

/***/ "(rsc)/./lib/auth.ts":
/*!*********************!*\
  !*** ./lib/auth.ts ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   getBearerFromRequest: () => (/* binding */ getBearerFromRequest),\n/* harmony export */   requireUserFromRequest: () => (/* binding */ requireUserFromRequest),\n/* harmony export */   supabaseFromRequest: () => (/* binding */ supabaseFromRequest)\n/* harmony export */ });\n/* harmony import */ var _supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @supabase/supabase-js */ \"(rsc)/./node_modules/@supabase/supabase-js/dist/module/index.js\");\n// lib/auth.ts\n\nfunction getBearerFromRequest(req) {\n    const a = req.headers.get(\"authorization\") || req.headers.get(\"Authorization\") || \"\";\n    const m = a.match(/^Bearer\\s+(.+)$/i);\n    return m ? m[1] : null;\n}\nfunction getEnv() {\n    const url = \"https://awxeorfppxdsygnhxlth.supabase.co\" || 0;\n    const key = \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3eGVvcmZwcHhkc3lnbmh4bHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MTExOTUsImV4cCI6MjA3MDE4NzE5NX0.62qbnPYJc-UKAYiedhe9EhMcTTgO5iX6RniGKGr6rtk\" || 0;\n    if (!url || !key) throw new Error(\"Supabase URL/Anon key missing in env.\");\n    return {\n        url,\n        key\n    };\n}\n/** RLS-aware Supabase client using the user's JWT from the request */ function supabaseFromRequest(req) {\n    const { url, key } = getEnv();\n    const jwt = getBearerFromRequest(req);\n    const supa = (0,_supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__.createClient)(url, key, {\n        auth: {\n            persistSession: false,\n            autoRefreshToken: false\n        },\n        global: {\n            headers: jwt ? {\n                Authorization: `Bearer ${jwt}`\n            } : {}\n        }\n    });\n    return {\n        supa,\n        jwt\n    };\n}\nasync function requireUserFromRequest(req) {\n    const { supa } = supabaseFromRequest(req);\n    const { data, error } = await supa.auth.getUser();\n    if (error || !data?.user) throw new Error(error?.message || \"Unauthorized\");\n    return data.user;\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvYXV0aC50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUEsY0FBYztBQUN1QztBQUU5QyxTQUFTQyxxQkFBcUJDLEdBQVk7SUFDL0MsTUFBTUMsSUFBSUQsSUFBSUUsT0FBTyxDQUFDQyxHQUFHLENBQUMsb0JBQW9CSCxJQUFJRSxPQUFPLENBQUNDLEdBQUcsQ0FBQyxvQkFBb0I7SUFDbEYsTUFBTUMsSUFBSUgsRUFBRUksS0FBSyxDQUFDO0lBQ2xCLE9BQU9ELElBQUlBLENBQUMsQ0FBQyxFQUFFLEdBQUc7QUFDcEI7QUFFQSxTQUFTRTtJQUNQLE1BQU1DLE1BQU1DLDBDQUFvQyxJQUFJQSxDQUF3QjtJQUM1RSxNQUFNSSxNQUFNSixrTkFBeUMsSUFBSUEsQ0FBNkI7SUFDdEYsSUFBSSxDQUFDRCxPQUFPLENBQUNLLEtBQUssTUFBTSxJQUFJRyxNQUFNO0lBQ2xDLE9BQU87UUFBRVI7UUFBS0s7SUFBSTtBQUNwQjtBQUVBLG9FQUFvRSxHQUM3RCxTQUFTSSxvQkFBb0JoQixHQUFZO0lBQzlDLE1BQU0sRUFBRU8sR0FBRyxFQUFFSyxHQUFHLEVBQUUsR0FBR047SUFDckIsTUFBTVcsTUFBTWxCLHFCQUFxQkM7SUFDakMsTUFBTWtCLE9BQU9wQixtRUFBWUEsQ0FBQ1MsS0FBS0ssS0FBSztRQUNsQ08sTUFBTTtZQUFFQyxnQkFBZ0I7WUFBT0Msa0JBQWtCO1FBQU07UUFDdkRDLFFBQVE7WUFBRXBCLFNBQVNlLE1BQU07Z0JBQUVNLGVBQWUsQ0FBQyxPQUFPLEVBQUVOLElBQUksQ0FBQztZQUFDLElBQUksQ0FBQztRQUFFO0lBQ25FO0lBQ0EsT0FBTztRQUFFQztRQUFNRDtJQUFJO0FBQ3JCO0FBRU8sZUFBZU8sdUJBQXVCeEIsR0FBWTtJQUN2RCxNQUFNLEVBQUVrQixJQUFJLEVBQUUsR0FBR0Ysb0JBQW9CaEI7SUFDckMsTUFBTSxFQUFFeUIsSUFBSSxFQUFFQyxLQUFLLEVBQUUsR0FBRyxNQUFNUixLQUFLQyxJQUFJLENBQUNRLE9BQU87SUFDL0MsSUFBSUQsU0FBUyxDQUFDRCxNQUFNRyxNQUFNLE1BQU0sSUFBSWIsTUFBTVcsT0FBT0csV0FBVztJQUM1RCxPQUFPSixLQUFLRyxJQUFJO0FBQ2xCIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vc291bmRtaW5kLy4vbGliL2F1dGgudHM/YmY3ZSJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBsaWIvYXV0aC50c1xuaW1wb3J0IHsgY3JlYXRlQ2xpZW50IH0gZnJvbSBcIkBzdXBhYmFzZS9zdXBhYmFzZS1qc1wiO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0QmVhcmVyRnJvbVJlcXVlc3QocmVxOiBSZXF1ZXN0KTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IGEgPSByZXEuaGVhZGVycy5nZXQoXCJhdXRob3JpemF0aW9uXCIpIHx8IHJlcS5oZWFkZXJzLmdldChcIkF1dGhvcml6YXRpb25cIikgfHwgXCJcIjtcbiAgY29uc3QgbSA9IGEubWF0Y2goL15CZWFyZXJcXHMrKC4rKSQvaSk7XG4gIHJldHVybiBtID8gbVsxXSA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIGdldEVudigpIHtcbiAgY29uc3QgdXJsID0gcHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfU1VQQUJBU0VfVVJMIHx8IHByb2Nlc3MuZW52LlNVUEFCQVNFX1VSTDtcbiAgY29uc3Qga2V5ID0gcHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfU1VQQUJBU0VfQU5PTl9LRVkgfHwgcHJvY2Vzcy5lbnYuU1VQQUJBU0VfQU5PTl9LRVk7XG4gIGlmICghdXJsIHx8ICFrZXkpIHRocm93IG5ldyBFcnJvcihcIlN1cGFiYXNlIFVSTC9Bbm9uIGtleSBtaXNzaW5nIGluIGVudi5cIik7XG4gIHJldHVybiB7IHVybCwga2V5IH07XG59XG5cbi8qKiBSTFMtYXdhcmUgU3VwYWJhc2UgY2xpZW50IHVzaW5nIHRoZSB1c2VyJ3MgSldUIGZyb20gdGhlIHJlcXVlc3QgKi9cbmV4cG9ydCBmdW5jdGlvbiBzdXBhYmFzZUZyb21SZXF1ZXN0KHJlcTogUmVxdWVzdCkge1xuICBjb25zdCB7IHVybCwga2V5IH0gPSBnZXRFbnYoKTtcbiAgY29uc3Qgand0ID0gZ2V0QmVhcmVyRnJvbVJlcXVlc3QocmVxKTtcbiAgY29uc3Qgc3VwYSA9IGNyZWF0ZUNsaWVudCh1cmwsIGtleSwge1xuICAgIGF1dGg6IHsgcGVyc2lzdFNlc3Npb246IGZhbHNlLCBhdXRvUmVmcmVzaFRva2VuOiBmYWxzZSB9LFxuICAgIGdsb2JhbDogeyBoZWFkZXJzOiBqd3QgPyB7IEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHtqd3R9YCB9IDoge30gfSxcbiAgfSk7XG4gIHJldHVybiB7IHN1cGEsIGp3dCB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVxdWlyZVVzZXJGcm9tUmVxdWVzdChyZXE6IFJlcXVlc3QpIHtcbiAgY29uc3QgeyBzdXBhIH0gPSBzdXBhYmFzZUZyb21SZXF1ZXN0KHJlcSk7XG4gIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IHN1cGEuYXV0aC5nZXRVc2VyKCk7XG4gIGlmIChlcnJvciB8fCAhZGF0YT8udXNlcikgdGhyb3cgbmV3IEVycm9yKGVycm9yPy5tZXNzYWdlIHx8IFwiVW5hdXRob3JpemVkXCIpO1xuICByZXR1cm4gZGF0YS51c2VyO1xufVxuIl0sIm5hbWVzIjpbImNyZWF0ZUNsaWVudCIsImdldEJlYXJlckZyb21SZXF1ZXN0IiwicmVxIiwiYSIsImhlYWRlcnMiLCJnZXQiLCJtIiwibWF0Y2giLCJnZXRFbnYiLCJ1cmwiLCJwcm9jZXNzIiwiZW52IiwiTkVYVF9QVUJMSUNfU1VQQUJBU0VfVVJMIiwiU1VQQUJBU0VfVVJMIiwia2V5IiwiTkVYVF9QVUJMSUNfU1VQQUJBU0VfQU5PTl9LRVkiLCJTVVBBQkFTRV9BTk9OX0tFWSIsIkVycm9yIiwic3VwYWJhc2VGcm9tUmVxdWVzdCIsImp3dCIsInN1cGEiLCJhdXRoIiwicGVyc2lzdFNlc3Npb24iLCJhdXRvUmVmcmVzaFRva2VuIiwiZ2xvYmFsIiwiQXV0aG9yaXphdGlvbiIsInJlcXVpcmVVc2VyRnJvbVJlcXVlc3QiLCJkYXRhIiwiZXJyb3IiLCJnZXRVc2VyIiwidXNlciIsIm1lc3NhZ2UiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./lib/auth.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@supabase","vendor-chunks/tr46","vendor-chunks/whatwg-url","vendor-chunks/webidl-conversions"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fmusic%2Flist%2Froute&page=%2Fapi%2Fmusic%2Flist%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fmusic%2Flist%2Froute.ts&appDir=%2FUsers%2Fcormackerr%2FDesktop%2Fsoundmind%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fcormackerr%2FDesktop%2Fsoundmind&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();