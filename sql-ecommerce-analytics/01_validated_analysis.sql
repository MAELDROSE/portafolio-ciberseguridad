-- =========================================================================
-- SQL E-COMMERCE ANALYTICS - VALIDATED PRACTICE
-- SQL Server
-- =========================================================================

-- =========================================================================
-- 0. DATASET COVERAGE
-- Requirement: at least 500 orders covering a minimum of 12 months
-- =========================================================================
SELECT 
    COUNT(OrderId) AS TotalOrders,
    MIN(OrderDate) AS FechaAntigua,
    MAX(OrderDate) AS FechaReciente,
    DATEDIFF(month, MIN(OrderDate), MAX(OrderDate)) AS MesesCubiertos
FROM Orders;


-- =========================================================================
-- 1. ORDERS WITH ONE ITEM VS MULTIPLE ITEMS
-- Interpretation: one OrderItems row = one line item.
-- =========================================================================
PRINT '--- 1. ORDENES CON UN ARTICULO ---';

SELECT 
    OrderId, 
    COUNT(ProductId) AS TotalArticulos
FROM OrderItems
GROUP BY OrderId
HAVING COUNT(ProductId) = 1;


PRINT '--- 2. ORDENES CON MULTIPLES ARTICULOS ---';

WITH ConteoArticulos AS (
    SELECT 
        OI.OrderId, 
        P.ProductId, 
        P.ProductName, 
        P.Category,
        OI.Quantity,
        OI.UnitPrice,
        COUNT(*) OVER(PARTITION BY OI.OrderId) AS TotalArticulosPorOrden
    FROM OrderItems OI
    INNER JOIN Products P 
        ON OI.ProductId = P.ProductId
)
SELECT 
    OrderId, 
    ProductId, 
    ProductName, 
    Category, 
    Quantity, 
    UnitPrice
FROM ConteoArticulos
WHERE TotalArticulosPorOrden > 1
ORDER BY OrderId;


-- =========================================================================
-- 2. REPEATED AND INACTIVE CUSTOMERS
-- =========================================================================
PRINT '--- 3. CLIENTES RECURRENTES ---';

SELECT 
    CustomerId, 
    COUNT(OrderId) AS TotalOrdenes
FROM Orders
GROUP BY CustomerId
HAVING COUNT(OrderId) > 1
ORDER BY TotalOrdenes DESC;


PRINT '--- 4. CLIENTES INACTIVOS ---';

/*
Methodology:
The exercise did not specify a time threshold for inactivity.
To avoid inventing an arbitrary rule, an inactive customer is defined here
as a registered customer with zero orders.
*/
SELECT 
    C.CustomerId
FROM Customers C
LEFT JOIN Orders O 
    ON C.CustomerId = O.CustomerId
WHERE O.OrderId IS NULL;


-- =========================================================================
-- 3. OPERATIONAL EXCEPTIONS
-- =========================================================================
PRINT '--- 5. ORDENES CANCELADAS ---';

/*
If the exact Status vocabulary is known, an equality comparison is preferable.
This LIKE search tolerates values such as Cancelled / Canceled / Cancelado.
*/
SELECT 
    OrderId, 
    CustomerId, 
    OrderDate, 
    Status
FROM Orders
WHERE LOWER(Status) LIKE '%cancel%';


PRINT '--- 6. PAGOS FALLIDOS ---';

SELECT 
    PaymentId, 
    OrderId, 
    PaymentDate, 
    PaymentMethod, 
    Amount, 
    PaymentStatus
FROM Payments
WHERE PaymentStatus = 'Failed';


PRINT '--- 7. PAGOS REEMBOLSADOS ---';

SELECT 
    PaymentId, 
    OrderId, 
    PaymentDate, 
    PaymentMethod, 
    Amount, 
    PaymentStatus
FROM Payments
WHERE PaymentStatus = 'Refunded';


PRINT '--- 8. PAGOS PENDIENTES ---';

SELECT 
    PaymentId, 
    OrderId, 
    PaymentDate, 
    PaymentMethod, 
    Amount, 
    PaymentStatus
FROM Payments
WHERE PaymentStatus = 'Pending';


PRINT '--- 9. DESCUENTOS APLICADOS ---';

SELECT 
    OrderId, 
    ProductId, 
    Quantity, 
    UnitPrice, 
    DiscountPct,
    CAST(
        Quantity * UnitPrice * (DiscountPct / 100.0) 
        AS DECIMAL(18,2)
    ) AS TotalDescontado
FROM OrderItems
WHERE DiscountPct > 0;


PRINT '--- 10. DEVOLUCIONES ---';

SELECT 
    R.ReturnId, 
    R.ReturnDate, 
    R.Reason, 
    R.RefundAmount,
    OI.OrderId, 
    OI.ProductId
FROM Returns R
INNER JOIN OrderItems OI 
    ON R.OrderItemId = OI.OrderItemId
ORDER BY R.ReturnDate DESC;


-- =========================================================================
-- 4. LATE DELIVERIES - METHODOLOGY NOTE
-- =========================================================================
/*
Not classified in this exercise.

Orders contains ShippingDate and DeliveryDate, but the problem statement does
not define an expected delivery date, promised delivery date, SLA, or maximum
allowed delivery duration.

Without that business rule, classifying a delivery as "late" would require an
arbitrary assumption, so the analysis intentionally leaves this metric open.
*/
