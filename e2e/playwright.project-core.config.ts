import {defineConfig} from '@playwright/test'
export default defineConfig({testDir:'.',testMatch:'project-core.spec.js',workers:1,timeout:45000,retries:0,reporter:[['list']],use:{headless:true,screenshot:'only-on-failure',trace:'retain-on-failure'}})
