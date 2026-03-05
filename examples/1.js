async getSummary() {
		try {
			let { startDate, endDate } = this.request.query;
			const sellerCode = this.request.user.storeCode;

			// Default Date Range (Last 1 Month)
			if (!startDate || !endDate) {
				const currentDate = this.utility.getCurrentDate();
				const oneMonthBefore = new Date(currentDate);
				oneMonthBefore.setMonth(currentDate.getMonth() - 1);

				startDate = oneMonthBefore;
				endDate = currentDate;
			}

			startDate = new Date(startDate);
			startDate.setHours(0, 0, 0, 0);

			endDate = new Date(endDate);
			endDate.setDate(endDate.getDate() + 1);
			endDate.setHours(0, 0, 0, 0);

			/**
			 * Use refund_application_date if exists,
			 * otherwise use shipment_completion_date
			 */
			const reportingDateExpression = `
            COALESCE(
                sales.refund_application_date,
                sales.shipment_completion_date
            )`;

			const summaryResult = await this.salesDataRepository
				.createQueryBuilder("sales")
				.where("sales.seller_code = :sellerCode", { sellerCode })
				.andWhere(`${reportingDateExpression} IS NOT NULL`)
				.andWhere(`${reportingDateExpression} >= :startDate`, {
					startDate
				})
				.andWhere(`${reportingDateExpression} < :endDate`, {
					endDate
				})
				.select(
					"COUNT(DISTINCT sales.order_id)::int",
					"number_of_orders"
				)
				.addSelect(
					"COALESCE(SUM(sales.product_price_subtotal), 0)",
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
                0)`,
					"average_order_value"
				)
				.addSelect(
					`ROUND(
                    COALESCE(SUM(sales.sales_volume), 0)
                    / NULLIF(COUNT(DISTINCT sales.order_id), 0),
                2)`,
					"average_items_per_order"
				)
				.getRawOne();

			//Transform result to response format
			const data = [
				{
					title: this.response.t("number_of_orders"),
					value: Number(summaryResult.number_of_orders),
					unit: this.response.t("orders")
				},
				{
					title: this.response.t("order_sales_amount"),
					value: Number(summaryResult.order_sales_amount),
					unit: "¥"
				},
				{
					title: this.response.t("number_of_items_sold"),
					value: Number(summaryResult.number_of_items_sold),
					unit: this.response.t("products")
				},
				{
					title: this.response.t("average_order_value"),
					value: Number(summaryResult.average_order_value),
					unit: "¥"
				},
				{
					title: this.response.t("average_items_sold"),
					value: Number(summaryResult.average_items_per_order),
					unit: this.response.t("products")
				}
			];

			return sendResponse(
				this.response,
				this.response.t("summary_report"),
				data
			);

		} catch (error) {
			logger.error(concatenateLogs(error));
			return sendServerError(this.response);
		}
	}
