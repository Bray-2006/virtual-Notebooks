import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'dashboard',
        loadComponent: () => import('./virtual-notebooks/pages/dashboard-page/dashboard-page'),
        children: [
            {
                path: 'notebook',
                loadComponent: () => import('./virtual-notebooks/pages/notebooks-template/notebooks-template')
            },
            {
                path: '**',
                redirectTo: 'notebook'
            }

        ]
    },


    {
        path: '**',
        redirectTo: 'dashboard'
    }
];
