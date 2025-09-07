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
exports.id = "app/api/enrich/deezer/route";
exports.ids = ["app/api/enrich/deezer/route"];
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

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fenrich%2Fdeezer%2Froute&page=%2Fapi%2Fenrich%2Fdeezer%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fenrich%2Fdeezer%2Froute.ts&appDir=%2FUsers%2Fcormackerr%2FDesktop%2Fsoundmind%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fcormackerr%2FDesktop%2Fsoundmind&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!***************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fenrich%2Fdeezer%2Froute&page=%2Fapi%2Fenrich%2Fdeezer%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fenrich%2Fdeezer%2Froute.ts&appDir=%2FUsers%2Fcormackerr%2FDesktop%2Fsoundmind%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fcormackerr%2FDesktop%2Fsoundmind&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \***************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   originalPathname: () => (/* binding */ originalPathname),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ \"(rsc)/./node_modules/next/dist/server/future/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_cormackerr_Desktop_soundmind_app_api_enrich_deezer_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/enrich/deezer/route.ts */ \"(rsc)/./app/api/enrich/deezer/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/enrich/deezer/route\",\n        pathname: \"/api/enrich/deezer\",\n        filename: \"route\",\n        bundlePath: \"app/api/enrich/deezer/route\"\n    },\n    resolvedPagePath: \"/Users/cormackerr/Desktop/soundmind/app/api/enrich/deezer/route.ts\",\n    nextConfigOutput,\n    userland: _Users_cormackerr_Desktop_soundmind_app_api_enrich_deezer_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks } = routeModule;\nconst originalPathname = \"/api/enrich/deezer/route\";\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        serverHooks,\n        staticGenerationAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIuanM/bmFtZT1hcHAlMkZhcGklMkZlbnJpY2glMkZkZWV6ZXIlMkZyb3V0ZSZwYWdlPSUyRmFwaSUyRmVucmljaCUyRmRlZXplciUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFwaSUyRmVucmljaCUyRmRlZXplciUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRmNvcm1hY2tlcnIlMkZEZXNrdG9wJTJGc291bmRtaW5kJTJGYXBwJnBhZ2VFeHRlbnNpb25zPXRzeCZwYWdlRXh0ZW5zaW9ucz10cyZwYWdlRXh0ZW5zaW9ucz1qc3gmcGFnZUV4dGVuc2lvbnM9anMmcm9vdERpcj0lMkZVc2VycyUyRmNvcm1hY2tlcnIlMkZEZXNrdG9wJTJGc291bmRtaW5kJmlzRGV2PXRydWUmdHNjb25maWdQYXRoPXRzY29uZmlnLmpzb24mYmFzZVBhdGg9JmFzc2V0UHJlZml4PSZuZXh0Q29uZmlnT3V0cHV0PSZwcmVmZXJyZWRSZWdpb249Jm1pZGRsZXdhcmVDb25maWc9ZTMwJTNEISIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBc0c7QUFDdkM7QUFDYztBQUNrQjtBQUMvRjtBQUNBO0FBQ0E7QUFDQSx3QkFBd0IsZ0hBQW1CO0FBQzNDO0FBQ0EsY0FBYyx5RUFBUztBQUN2QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsWUFBWTtBQUNaLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQSxRQUFRLGlFQUFpRTtBQUN6RTtBQUNBO0FBQ0EsV0FBVyw0RUFBVztBQUN0QjtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ3VIOztBQUV2SCIsInNvdXJjZXMiOlsid2VicGFjazovL3NvdW5kbWluZC8/YjNkNyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHBSb3V0ZVJvdXRlTW9kdWxlIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvZnV0dXJlL3JvdXRlLW1vZHVsZXMvYXBwLXJvdXRlL21vZHVsZS5jb21waWxlZFwiO1xuaW1wb3J0IHsgUm91dGVLaW5kIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvZnV0dXJlL3JvdXRlLWtpbmRcIjtcbmltcG9ydCB7IHBhdGNoRmV0Y2ggYXMgX3BhdGNoRmV0Y2ggfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9saWIvcGF0Y2gtZmV0Y2hcIjtcbmltcG9ydCAqIGFzIHVzZXJsYW5kIGZyb20gXCIvVXNlcnMvY29ybWFja2Vyci9EZXNrdG9wL3NvdW5kbWluZC9hcHAvYXBpL2VucmljaC9kZWV6ZXIvcm91dGUudHNcIjtcbi8vIFdlIGluamVjdCB0aGUgbmV4dENvbmZpZ091dHB1dCBoZXJlIHNvIHRoYXQgd2UgY2FuIHVzZSB0aGVtIGluIHRoZSByb3V0ZVxuLy8gbW9kdWxlLlxuY29uc3QgbmV4dENvbmZpZ091dHB1dCA9IFwiXCJcbmNvbnN0IHJvdXRlTW9kdWxlID0gbmV3IEFwcFJvdXRlUm91dGVNb2R1bGUoe1xuICAgIGRlZmluaXRpb246IHtcbiAgICAgICAga2luZDogUm91dGVLaW5kLkFQUF9ST1VURSxcbiAgICAgICAgcGFnZTogXCIvYXBpL2VucmljaC9kZWV6ZXIvcm91dGVcIixcbiAgICAgICAgcGF0aG5hbWU6IFwiL2FwaS9lbnJpY2gvZGVlemVyXCIsXG4gICAgICAgIGZpbGVuYW1lOiBcInJvdXRlXCIsXG4gICAgICAgIGJ1bmRsZVBhdGg6IFwiYXBwL2FwaS9lbnJpY2gvZGVlemVyL3JvdXRlXCJcbiAgICB9LFxuICAgIHJlc29sdmVkUGFnZVBhdGg6IFwiL1VzZXJzL2Nvcm1hY2tlcnIvRGVza3RvcC9zb3VuZG1pbmQvYXBwL2FwaS9lbnJpY2gvZGVlemVyL3JvdXRlLnRzXCIsXG4gICAgbmV4dENvbmZpZ091dHB1dCxcbiAgICB1c2VybGFuZFxufSk7XG4vLyBQdWxsIG91dCB0aGUgZXhwb3J0cyB0aGF0IHdlIG5lZWQgdG8gZXhwb3NlIGZyb20gdGhlIG1vZHVsZS4gVGhpcyBzaG91bGRcbi8vIGJlIGVsaW1pbmF0ZWQgd2hlbiB3ZSd2ZSBtb3ZlZCB0aGUgb3RoZXIgcm91dGVzIHRvIHRoZSBuZXcgZm9ybWF0LiBUaGVzZVxuLy8gYXJlIHVzZWQgdG8gaG9vayBpbnRvIHRoZSByb3V0ZS5cbmNvbnN0IHsgcmVxdWVzdEFzeW5jU3RvcmFnZSwgc3RhdGljR2VuZXJhdGlvbkFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MgfSA9IHJvdXRlTW9kdWxlO1xuY29uc3Qgb3JpZ2luYWxQYXRobmFtZSA9IFwiL2FwaS9lbnJpY2gvZGVlemVyL3JvdXRlXCI7XG5mdW5jdGlvbiBwYXRjaEZldGNoKCkge1xuICAgIHJldHVybiBfcGF0Y2hGZXRjaCh7XG4gICAgICAgIHNlcnZlckhvb2tzLFxuICAgICAgICBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlXG4gICAgfSk7XG59XG5leHBvcnQgeyByb3V0ZU1vZHVsZSwgcmVxdWVzdEFzeW5jU3RvcmFnZSwgc3RhdGljR2VuZXJhdGlvbkFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MsIG9yaWdpbmFsUGF0aG5hbWUsIHBhdGNoRmV0Y2gsICB9O1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1hcHAtcm91dGUuanMubWFwIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fenrich%2Fdeezer%2Froute&page=%2Fapi%2Fenrich%2Fdeezer%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fenrich%2Fdeezer%2Froute.ts&appDir=%2FUsers%2Fcormackerr%2FDesktop%2Fsoundmind%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fcormackerr%2FDesktop%2Fsoundmind&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./app/api/enrich/deezer/route.ts":
/*!****************************************!*\
  !*** ./app/api/enrich/deezer/route.ts ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   POST: () => (/* binding */ POST)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n/* harmony import */ var _lib_supabaseAdmin__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/lib/supabaseAdmin */ \"(rsc)/./lib/supabaseAdmin.ts\");\n// app/api/enrich/deezer/route.ts\n\n\nasync function fetchDeezerByISRC(isrc) {\n    // Undocumented but widely used endpoint: /track/isrc:<ISRC>\n    const url = `https://api.deezer.com/track/isrc:${encodeURIComponent(isrc)}`;\n    const res = await fetch(url);\n    if (!res.ok) return null;\n    const json = await res.json();\n    if (json && json.id) return {\n        id: json.id,\n        bpm: json.bpm,\n        gain: json.gain\n    };\n    return null;\n}\nasync function POST() {\n    if (!_lib_supabaseAdmin__WEBPACK_IMPORTED_MODULE_1__.usingServiceRole) {\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: \"Missing service role\"\n        }, {\n            status: 500\n        });\n    }\n    // Pick tracks that have an ISRC but no tempo or gain yet\n    const { data: rows, error } = await _lib_supabaseAdmin__WEBPACK_IMPORTED_MODULE_1__.supabaseAdmin.from(\"spotify_tracks\").select(\"id,isrc,tempo,gain,deezer_track_id\").not(\"isrc\", \"is\", null).or(\"tempo.is.null,gain.is.null,deezer_track_id.is.null\").limit(200);\n    if (error) return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n        error: error.message\n    }, {\n        status: 500\n    });\n    if (!rows?.length) return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n        ok: true,\n        looked_up: 0,\n        updated: 0\n    });\n    let updated = 0;\n    for (const r of rows){\n        if (!r.isrc) continue;\n        try {\n            const d = await fetchDeezerByISRC(r.isrc);\n            if (!d) continue;\n            const patch = {\n                id: r.id,\n                deezer_track_id: d.id?.toString() ?? r.deezer_track_id,\n                tempo: typeof d.bpm === \"number\" ? d.bpm : r.tempo,\n                gain: typeof d.gain === \"number\" ? d.gain : r.gain,\n                last_enriched_at: new Date().toISOString(),\n                meta_provider: {\n                    ...r.meta_provider || {},\n                    deezer: true\n                }\n            };\n            const { error: updErr } = await _lib_supabaseAdmin__WEBPACK_IMPORTED_MODULE_1__.supabaseAdmin.from(\"spotify_tracks\").upsert(patch);\n            if (updErr) return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: updErr.message\n            }, {\n                status: 500\n            });\n            updated++;\n        } catch  {\n        /* ignore */ }\n        // Be gentle to Deezer\n        await new Promise((res)=>setTimeout(res, 120));\n    }\n    return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n        ok: true,\n        looked_up: rows.length,\n        updated\n    });\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,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WyJ3ZWJwYWNrOi8vc291bmRtaW5kLy4vYXBwL2FwaS9lbnJpY2gvZGVlemVyL3JvdXRlLnRzP2FmYTMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gYXBwL2FwaS9lbnJpY2gvZGVlemVyL3JvdXRlLnRzXG5pbXBvcnQgeyBOZXh0UmVzcG9uc2UgfSBmcm9tIFwibmV4dC9zZXJ2ZXJcIjtcbmltcG9ydCB7IHN1cGFiYXNlQWRtaW4sIHVzaW5nU2VydmljZVJvbGUgfSBmcm9tIFwiQC9saWIvc3VwYWJhc2VBZG1pblwiO1xuXG50eXBlIERlZXplclRyYWNrID0ge1xuICBpZD86IG51bWJlcjtcbiAgYnBtPzogbnVtYmVyO1xuICBnYWluPzogbnVtYmVyO1xufTtcblxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hEZWV6ZXJCeUlTUkMoaXNyYzogc3RyaW5nKTogUHJvbWlzZTxEZWV6ZXJUcmFjayB8IG51bGw+IHtcbiAgLy8gVW5kb2N1bWVudGVkIGJ1dCB3aWRlbHkgdXNlZCBlbmRwb2ludDogL3RyYWNrL2lzcmM6PElTUkM+XG4gIGNvbnN0IHVybCA9IGBodHRwczovL2FwaS5kZWV6ZXIuY29tL3RyYWNrL2lzcmM6JHtlbmNvZGVVUklDb21wb25lbnQoaXNyYyl9YDtcbiAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2godXJsKTtcbiAgaWYgKCFyZXMub2spIHJldHVybiBudWxsO1xuICBjb25zdCBqc29uID0gYXdhaXQgcmVzLmpzb24oKTtcbiAgaWYgKGpzb24gJiYganNvbi5pZCkgcmV0dXJuIHsgaWQ6IGpzb24uaWQsIGJwbToganNvbi5icG0sIGdhaW46IGpzb24uZ2FpbiB9O1xuICByZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIFBPU1QoKSB7XG4gIGlmICghdXNpbmdTZXJ2aWNlUm9sZSkge1xuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiBcIk1pc3Npbmcgc2VydmljZSByb2xlXCIgfSwgeyBzdGF0dXM6IDUwMCB9KTtcbiAgfVxuXG4gIC8vIFBpY2sgdHJhY2tzIHRoYXQgaGF2ZSBhbiBJU1JDIGJ1dCBubyB0ZW1wbyBvciBnYWluIHlldFxuICBjb25zdCB7IGRhdGE6IHJvd3MsIGVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZUFkbWluXG4gICAgLmZyb20oXCJzcG90aWZ5X3RyYWNrc1wiKVxuICAgIC5zZWxlY3QoXCJpZCxpc3JjLHRlbXBvLGdhaW4sZGVlemVyX3RyYWNrX2lkXCIpXG4gICAgLm5vdChcImlzcmNcIiwgXCJpc1wiLCBudWxsKVxuICAgIC5vcihcInRlbXBvLmlzLm51bGwsZ2Fpbi5pcy5udWxsLGRlZXplcl90cmFja19pZC5pcy5udWxsXCIpXG4gICAgLmxpbWl0KDIwMCk7XG5cbiAgaWYgKGVycm9yKSByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9LCB7IHN0YXR1czogNTAwIH0pO1xuICBpZiAoIXJvd3M/Lmxlbmd0aCkgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgb2s6IHRydWUsIGxvb2tlZF91cDogMCwgdXBkYXRlZDogMCB9KTtcblxuICBsZXQgdXBkYXRlZCA9IDA7XG4gIGZvciAoY29uc3QgciBvZiByb3dzKSB7XG4gICAgaWYgKCFyLmlzcmMpIGNvbnRpbnVlO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBkID0gYXdhaXQgZmV0Y2hEZWV6ZXJCeUlTUkMoci5pc3JjKTtcbiAgICAgIGlmICghZCkgY29udGludWU7XG4gICAgICBjb25zdCBwYXRjaDogYW55ID0ge1xuICAgICAgICBpZDogci5pZCxcbiAgICAgICAgZGVlemVyX3RyYWNrX2lkOiBkLmlkPy50b1N0cmluZygpID8/IHIuZGVlemVyX3RyYWNrX2lkLFxuICAgICAgICB0ZW1wbzogdHlwZW9mIGQuYnBtID09PSBcIm51bWJlclwiID8gZC5icG0gOiByLnRlbXBvLFxuICAgICAgICBnYWluOiB0eXBlb2YgZC5nYWluID09PSBcIm51bWJlclwiID8gZC5nYWluIDogci5nYWluLFxuICAgICAgICBsYXN0X2VucmljaGVkX2F0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgIG1ldGFfcHJvdmlkZXI6IHsgLi4uKHIubWV0YV9wcm92aWRlciB8fCB7fSksIGRlZXplcjogdHJ1ZSB9LFxuICAgICAgfTtcbiAgICAgIGNvbnN0IHsgZXJyb3I6IHVwZEVyciB9ID0gYXdhaXQgc3VwYWJhc2VBZG1pbi5mcm9tKFwic3BvdGlmeV90cmFja3NcIikudXBzZXJ0KHBhdGNoKTtcbiAgICAgIGlmICh1cGRFcnIpIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiB1cGRFcnIubWVzc2FnZSB9LCB7IHN0YXR1czogNTAwIH0pO1xuICAgICAgdXBkYXRlZCsrO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLyogaWdub3JlICovXG4gICAgfVxuICAgIC8vIEJlIGdlbnRsZSB0byBEZWV6ZXJcbiAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzKSA9PiBzZXRUaW1lb3V0KHJlcywgMTIwKSk7XG4gIH1cblxuICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBvazogdHJ1ZSwgbG9va2VkX3VwOiByb3dzLmxlbmd0aCwgdXBkYXRlZCB9KTtcbn1cbiJdLCJuYW1lcyI6WyJOZXh0UmVzcG9uc2UiLCJzdXBhYmFzZUFkbWluIiwidXNpbmdTZXJ2aWNlUm9sZSIsImZldGNoRGVlemVyQnlJU1JDIiwiaXNyYyIsInVybCIsImVuY29kZVVSSUNvbXBvbmVudCIsInJlcyIsImZldGNoIiwib2siLCJqc29uIiwiaWQiLCJicG0iLCJnYWluIiwiUE9TVCIsImVycm9yIiwic3RhdHVzIiwiZGF0YSIsInJvd3MiLCJmcm9tIiwic2VsZWN0Iiwibm90Iiwib3IiLCJsaW1pdCIsIm1lc3NhZ2UiLCJsZW5ndGgiLCJsb29rZWRfdXAiLCJ1cGRhdGVkIiwiciIsImQiLCJwYXRjaCIsImRlZXplcl90cmFja19pZCIsInRvU3RyaW5nIiwidGVtcG8iLCJsYXN0X2VucmljaGVkX2F0IiwiRGF0ZSIsInRvSVNPU3RyaW5nIiwibWV0YV9wcm92aWRlciIsImRlZXplciIsInVwZEVyciIsInVwc2VydCIsIlByb21pc2UiLCJzZXRUaW1lb3V0Il0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./app/api/enrich/deezer/route.ts\n");

/***/ }),

/***/ "(rsc)/./lib/supabaseAdmin.ts":
/*!******************************!*\
  !*** ./lib/supabaseAdmin.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   supabaseAdmin: () => (/* binding */ supabaseAdmin)\n/* harmony export */ });\n/* harmony import */ var _supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @supabase/supabase-js */ \"(rsc)/./node_modules/@supabase/supabase-js/dist/module/index.js\");\n// lib/supabaseAdmin.ts\n\nif (false) {}\nif (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error(\"Missing SUPABASE_SERVICE_ROLE_KEY\");\nconst supabaseAdmin = (0,_supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__.createClient)(\"https://awxeorfppxdsygnhxlth.supabase.co\", process.env.SUPABASE_SERVICE_ROLE_KEY, {\n    auth: {\n        persistSession: false,\n        autoRefreshToken: false\n    }\n});\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvc3VwYWJhc2VBZG1pbi50cyIsIm1hcHBpbmdzIjoiOzs7OztBQUFBLHVCQUF1QjtBQUM4QjtBQUVyRCxJQUFJLEtBQXFDLEVBQUUsRUFBb0Q7QUFDL0YsSUFBSSxDQUFDQyxRQUFRQyxHQUFHLENBQUNHLHlCQUF5QixFQUFFLE1BQU0sSUFBSUQsTUFBTTtBQUVyRCxNQUFNRSxnQkFBZ0JOLG1FQUFZQSxDQUN2Q0MsMENBQW9DLEVBQ3BDQSxRQUFRQyxHQUFHLENBQUNHLHlCQUF5QixFQUNyQztJQUNFRSxNQUFNO1FBQUVDLGdCQUFnQjtRQUFPQyxrQkFBa0I7SUFBTTtBQUN6RCxHQUNBIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vc291bmRtaW5kLy4vbGliL3N1cGFiYXNlQWRtaW4udHM/MDlkNSJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBsaWIvc3VwYWJhc2VBZG1pbi50c1xuaW1wb3J0IHsgY3JlYXRlQ2xpZW50IH0gZnJvbSBcIkBzdXBhYmFzZS9zdXBhYmFzZS1qc1wiO1xuXG5pZiAoIXByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX1NVUEFCQVNFX1VSTCkgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyBORVhUX1BVQkxJQ19TVVBBQkFTRV9VUkxcIik7XG5pZiAoIXByb2Nlc3MuZW52LlNVUEFCQVNFX1NFUlZJQ0VfUk9MRV9LRVkpIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgU1VQQUJBU0VfU0VSVklDRV9ST0xFX0tFWVwiKTtcblxuZXhwb3J0IGNvbnN0IHN1cGFiYXNlQWRtaW4gPSBjcmVhdGVDbGllbnQoXG4gIHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX1NVUEFCQVNFX1VSTCxcbiAgcHJvY2Vzcy5lbnYuU1VQQUJBU0VfU0VSVklDRV9ST0xFX0tFWSxcbiAge1xuICAgIGF1dGg6IHsgcGVyc2lzdFNlc3Npb246IGZhbHNlLCBhdXRvUmVmcmVzaFRva2VuOiBmYWxzZSB9LFxuICB9XG4pO1xuIl0sIm5hbWVzIjpbImNyZWF0ZUNsaWVudCIsInByb2Nlc3MiLCJlbnYiLCJORVhUX1BVQkxJQ19TVVBBQkFTRV9VUkwiLCJFcnJvciIsIlNVUEFCQVNFX1NFUlZJQ0VfUk9MRV9LRVkiLCJzdXBhYmFzZUFkbWluIiwiYXV0aCIsInBlcnNpc3RTZXNzaW9uIiwiYXV0b1JlZnJlc2hUb2tlbiJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./lib/supabaseAdmin.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@supabase","vendor-chunks/tr46","vendor-chunks/whatwg-url","vendor-chunks/webidl-conversions"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fenrich%2Fdeezer%2Froute&page=%2Fapi%2Fenrich%2Fdeezer%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fenrich%2Fdeezer%2Froute.ts&appDir=%2FUsers%2Fcormackerr%2FDesktop%2Fsoundmind%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fcormackerr%2FDesktop%2Fsoundmind&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();