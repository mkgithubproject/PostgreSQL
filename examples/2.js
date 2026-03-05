async getOrderReport() {
		try {
			const {
				viewBy = "daily",
				page = 1,
				limit = commonConfig.ITEMS_PER_PAGE,
				sortBy = "date",
				sortOrder = "DESC",
				startDate,
				endDate
			} = this.request.query;

			const storeCode = this.request.user.storeCode;

			const currentPage = Number(page);
			const take = Number(limit);
			const skip = (currentPage - 1) * take;

			// 🔹 Default Date Range (Last 1 Month)
			const today = this.utility.getCurrentDate();
			const defaultStart = new Date(today);
			defaultStart.setMonth(today.getMonth() - 1);

			const start = new Date(startDate || defaultStart);
			start.setHours(0, 0, 0, 0);

			const end = new Date(endDate || today);
			end.setDate(end.getDate() + 1);
			end.setHours(0, 0, 0, 0);

			/**
			 * Effective Date Logic
			 * If refund_application_date exists → use it
			 * Else → use shipment_completion_date
			 */
			const effectiveDateExpression = `
            COALESCE(
                sales.refund_application_date,
                sales.shipment_completion_date
            ) `;

			// 🔹 Period Configuration
			const periodMap: Record<string, string> = {
				daily: `DATE_TRUNC('day', ${effectiveDateExpression})`,
				weekly: `DATE_TRUNC('week', ${effectiveDateExpression})`,
				monthly: `DATE_TRUNC('month', ${effectiveDateExpression})`
			};

			const periodExpression =
				periodMap[viewBy] || periodMap.daily;

			const formattedPeriod =
				viewBy === "monthly"
					? `TO_CHAR(${periodExpression}, 'YYYY/MM')`
					: `TO_CHAR(${periodExpression}, 'YYYY/MM/DD')`;

			// Sorting
			const sortColumns: Record<string, string> = {
				date: periodExpression,
				numberOfOrders: "number_of_orders",
				orderSalesAmount: "order_sales_amount",
				numberOfItemsSold: "number_of_items_sold",
				averageOrderValue: "average_order_value"
			};

			const orderColumn =
				sortColumns[sortBy] || periodExpression;

			const orderDirection =
				sortOrder === "ASC" ? "ASC" : "DESC";

			// Base Query
			const baseQuery = this.salesDataRepository
				.createQueryBuilder("sales")
				.where("sales.seller_code = :storeCode", { storeCode })
				.andWhere(`${effectiveDateExpression} IS NOT NULL`)
				.andWhere(`${effectiveDateExpression} >= :start`, { start })
				.andWhere(`${effectiveDateExpression} < :end`, { end });

			// Data Query
			const dataQuery = baseQuery
				.clone()
				.select(formattedPeriod, "date")
				.addSelect(
					"COUNT(DISTINCT sales.order_id)::int",
					"number_of_orders"
				)
				.addSelect(
					"COALESCE(SUM(sales.product_price_subtotal), 0)::numeric",
					"order_sales_amount"
				)
				.addSelect(
					"COALESCE(SUM(sales.sales_volume), 0)::int",
					"number_of_items_sold"
				)
				.addSelect(
					`ROUND(
                    COALESCE(SUM(sales.product_price_subtotal), 0)
                    / NULLIF(COUNT(DISTINCT sales.order_id), 0),
                2)`,
					"average_order_value"
				)
				.groupBy(periodExpression)
				.orderBy(orderColumn, orderDirection)
				.offset(skip)
				.limit(take);

			// Count Query
			const countQuery = baseQuery
				.clone()
				.select(
					`COUNT(DISTINCT ${periodExpression})`,
					"total"
				);

			const [rawData, totalResult] = await Promise.all([
				dataQuery.getRawMany(),
				countQuery.getRawOne()
			]);

			const totalCount = Number(totalResult?.total || 0);
			const totalPages = Math.ceil(totalCount / take);

			// data transformation
			const data = rawData.map((row: any) => ({
				date: row.date,
				numberOfOrders: row.number_of_orders,
				orderSalesAmount: row.order_sales_amount,
				numberOfItemsSold: row.number_of_items_sold,
				averageOrderValue: row.average_order_value
			}));

			return sendResponse(
				this.response,
				this.response.t("order_level_report"),
				{
					data,
					pagination: {
						totalPages,
						totalCount,
						currentPage,
						currentTotalCount: Math.min(
							currentPage * take,
							totalCount
						)
					}
				}
			);

		} catch (error) {
			logger.error(concatenateLogs(error));
			return sendServerError(this.response);
		}
	}
