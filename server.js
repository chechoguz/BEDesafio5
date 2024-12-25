// Importar dependencias
const express = require('express');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Configurar variables de entorno
dotenv.config();

// Crear instancia de Express
const app = express();
const port = 3000;

// Configurar conexión a la base de datos
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Middleware para registrar solicitudes
app.use((req, res, next) => {
    console.log(`Consulta realizada a la ruta: ${req.path} a las ${new Date().toISOString()}`);
    next();
});

// Ruta GET /joyas
app.get('/joyas', async (req, res) => {
    try {
        const { limits = 10, page = 1, order_by = 'id_ASC' } = req.query;
        const [field, order] = order_by.split('_');
        const offset = (page - 1) * limits;

        const query = `
            SELECT * FROM inventario 
            ORDER BY ${field} ${order} 
            LIMIT $1 OFFSET $2
        `;
        const result = await pool.query(query, [limits, offset]);

        const data = result.rows.map((row) => ({
            ...row,
            links: {
                self: `/joyas/${row.id}`,
            },
        }));

        res.json({
            total: result.rowCount,
            page,
            limits,
            data,
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las joyas' });
    }
});

// Ruta GET /joyas/filtros
app.get('/joyas/filtros', async (req, res) => {
    try {
        const { precio_min = 0, precio_max = Infinity, categoria, metal } = req.query;

        const query = `
            SELECT * FROM inventario 
            WHERE precio >= $1 AND precio <= $2 
            AND ($3::text IS NULL OR categoria = $3) 
            AND ($4::text IS NULL OR metal = $4)
        `;
        const values = [precio_min, precio_max, categoria || null, metal || null];

        const result = await pool.query(query, values);

        // Verificar si hay resultados
        if (result.rows.length === 0) {
            return res.status(200).json([]);
        }

        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al filtrar las joyas' });
    }
});


// Manejo de rutas no encontradas
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Iniciar servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
