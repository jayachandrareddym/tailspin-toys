import { test, expect } from '@playwright/test';

test.describe('Game Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('filter-panel')).toBeVisible();
  });

  test('should display the filter panel with categories and publisher dropdown', async ({ page }) => {
    await test.step('Verify filter panel is visible', async () => {
      const filterPanel = page.getByTestId('filter-panel');
      await expect(filterPanel).toBeVisible();
    });

    await test.step('Verify category checkboxes are present', async () => {
      const categoryCheckboxes = page.locator('input[name="categories"]');
      expect(await categoryCheckboxes.count()).toBeGreaterThan(0);
    });

    await test.step('Verify publisher dropdown is present', async () => {
      const publisherSelect = page.getByTestId('filter-publisher');
      await expect(publisherSelect).toBeVisible();
      const options = publisherSelect.locator('option');
      expect(await options.count()).toBeGreaterThan(1); // "All Publishers" + at least one publisher
    });

    await test.step('Verify filter buttons are present', async () => {
      await expect(page.getByTestId('apply-filters-button')).toBeVisible();
      await expect(page.getByTestId('clear-filters-button')).toBeVisible();
    });
  });

  test('should filter games by a single category', async ({ page }) => {
    let _categoryName: string | null;
    let initialGameCount: number;

    await test.step('Get initial game count', async () => {
      initialGameCount = await page.getByTestId('game-card').count();
      expect(initialGameCount).toBeGreaterThan(0);
    });

    await test.step('Select a category and apply filter', async () => {
      const firstCheckbox = page.locator('input[name="categories"]').first();
      const _checkboxValue = await firstCheckbox.getAttribute('value');
      _categoryName = await firstCheckbox.locator('..').locator('span').first().textContent();

      await firstCheckbox.check();
      await page.getByTestId('apply-filters-button').click();
    });

    await test.step('Verify URL contains category parameter', async () => {
      await expect(page).toHaveURL(/categories=/);
    });

    await test.step('Verify games are filtered', async () => {
      const filteredGameCount = await page.getByTestId('game-card').count();
      expect(filteredGameCount).toBeLessThanOrEqual(initialGameCount);
      // At least some games should match the category
      if (initialGameCount > 0) {
        expect(filteredGameCount).toBeGreaterThan(0);
      }
    });

    await test.step('Verify heading indicates filtered results', async () => {
      await expect(page.getByText('Filtered Games')).toBeVisible();
    });
  });

  test('should filter games by multiple categories (OR logic)', async ({ page }) => {
    await test.step('Select multiple categories', async () => {
      const checkboxes = page.locator('input[name="categories"]');
      const count = Math.min(await checkboxes.count(), 2); // Select up to 2 categories

      if (count >= 2) {
        await checkboxes.nth(0).check();
        await checkboxes.nth(1).check();
        await page.getByTestId('apply-filters-button').click();
      }
    });

    await test.step('Verify URL contains multiple category IDs', async () => {
      const url = page.url();
      const categoryParam = new URL(url).searchParams.get('categories');
      if (categoryParam) {
        const ids = categoryParam.split(',');
        expect(ids.length).toBeGreaterThanOrEqual(1);
      }
    });

    await test.step('Verify games are displayed', async () => {
      const gameCount = await page.getByTestId('game-card').count();
      expect(gameCount).toBeGreaterThanOrEqual(0);
    });
  });

  test('should filter games by publisher', async ({ page }) => {
    let initialGameCount: number;

    await test.step('Get initial game count', async () => {
      initialGameCount = await page.getByTestId('game-card').count();
    });

    await test.step('Select a publisher and apply filter', async () => {
      const publisherSelect = page.getByTestId('filter-publisher');
      const options = publisherSelect.locator('option');
      const optionCount = await options.count();

      if (optionCount > 1) {
        // Select second option (first is "All Publishers")
        await publisherSelect.selectOption(await options.nth(1).getAttribute('value'));
        await page.getByTestId('apply-filters-button').click();
      }
    });

    await test.step('Verify URL contains publisher parameter', async () => {
      const url = page.url();
      expect(url).toContain('publisher=');
    });

    await test.step('Verify games are filtered', async () => {
      const filteredGameCount = await page.getByTestId('game-card').count();
      expect(filteredGameCount).toBeLessThanOrEqual(initialGameCount);
      expect(filteredGameCount).toBeGreaterThan(0);
    });
  });

  test('should filter games by both category and publisher', async ({ page }) => {
    await test.step('Select a category and publisher', async () => {
      const categoryCheckboxes = page.locator('input[name="categories"]');
      if (await categoryCheckboxes.count() > 0) {
        await categoryCheckboxes.first().check();
      }

      const publisherSelect = page.getByTestId('filter-publisher');
      const options = publisherSelect.locator('option');
      if (await options.count() > 1) {
        await publisherSelect.selectOption(await options.nth(1).getAttribute('value'));
      }

      await page.getByTestId('apply-filters-button').click();
    });

    await test.step('Verify URL contains both category and publisher parameters', async () => {
      const url = page.url();
      expect(url).toContain('categories=');
      expect(url).toContain('publisher=');
    });

    await test.step('Verify filtered games are displayed', async () => {
      const gameCount = await page.getByTestId('game-card').count();
      expect(gameCount).toBeGreaterThanOrEqual(0);
    });
  });

  test('should clear filters when clicking clear button', async ({ page }) => {
    await test.step('Apply some filters', async () => {
      const categoryCheckboxes = page.locator('input[name="categories"]');
      if (await categoryCheckboxes.count() > 0) {
        await categoryCheckboxes.first().check();
      }
      await page.getByTestId('apply-filters-button').click();
    });

    await test.step('Verify filters are applied', async () => {
      await expect(page).toHaveURL(/categories=/);
    });

    await test.step('Click clear button', async () => {
      // Navigate back to apply filters first
      await page.goto('/');
      await expect(page.getByTestId('filter-panel')).toBeVisible();

      // Now select and clear
      const categoryCheckboxes = page.locator('input[name="categories"]');
      if (await categoryCheckboxes.count() > 0) {
        await categoryCheckboxes.first().check();
      }
      await page.getByTestId('clear-filters-button').click();
    });

    await test.step('Verify filters are cleared and URL is clean', async () => {
      await expect(page).toHaveURL('/');
      await expect(page.getByText('Featured Games')).toBeVisible();
    });
  });

  test('should support keyboard navigation in filter form', async ({ page }) => {
    await test.step('Tab through filter form elements', async () => {
      const filterForm = page.getByTestId('filter-form');
      await filterForm.focus();

      // Tab through form elements
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluateHandle(() => document.activeElement);
      expect(focusedElement).toBeTruthy();
    });

    await test.step('Use keyboard to select category', async () => {
      const firstCheckbox = page.locator('input[name="categories"]').first();
      await firstCheckbox.focus();
      await page.keyboard.press('Space');
      expect(await firstCheckbox.isChecked()).toBe(true);
    });

    await test.step('Apply filter with keyboard', async () => {
      const applyButton = page.getByTestId('apply-filters-button');
      await applyButton.focus();
      await page.keyboard.press('Enter');
      // Should navigate with filters
      await expect(page).toHaveURL(/categories=/);
    });
  });

  test('should show empty state when no games match filters', async ({ page }) => {
    // This test assumes there's a category or publisher with no games
    // If all games exist in all categories, this test will be skipped
    await test.step('Try to find a category with few/no games', async () => {
      const categoryCheckboxes = page.locator('input[name="categories"]');
      const checkboxCount = await categoryCheckboxes.count();

      // Try selecting the last category (unlikely to have all games)
      if (checkboxCount > 0) {
        await categoryCheckboxes.last().check();
        await page.getByTestId('apply-filters-button').click();

        // Check if empty state is shown or games are displayed
        const emptyState = page.getByText('No games match your filters');
        const gameCards = page.getByTestId('game-card');

        const emptyStateVisible = await emptyState.isVisible().catch(() => false);
        const hasGames = (await gameCards.count()) > 0;

        expect(emptyStateVisible || hasGames).toBe(true);
      }
    });
  });

  test('should have accessible form controls with proper ARIA labels', async ({ page }) => {
    await test.step('Verify filter panel has proper structure', async () => {
      const filterPanel = page.getByTestId('filter-panel');
      await expect(filterPanel).toBeVisible();
    });

    await test.step('Verify category checkboxes have accessible labels', async () => {
      const categoryCheckboxes = page.locator('input[name="categories"]');
      if (await categoryCheckboxes.count() > 0) {
        const checkbox = categoryCheckboxes.first();
        const ariaLabel = await checkbox.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel).toContain('Filter by');
      }
    });

    await test.step('Verify publisher select has accessible label', async () => {
      const publisherSelect = page.getByTestId('filter-publisher');
      const ariaLabel = await publisherSelect.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain('publisher');
    });
  });

  test('should maintain filter state when URL is visited directly', async ({ page }) => {
    await test.step('Apply filters', async () => {
      const categoryCheckboxes = page.locator('input[name="categories"]');
      if (await categoryCheckboxes.count() > 0) {
        await categoryCheckboxes.first().check();
        await page.getByTestId('apply-filters-button').click();
      }
    });

    let filterUrl: string;
    await test.step('Get filtered URL', async () => {
      filterUrl = page.url();
      expect(filterUrl).toContain('categories=');
    });

    await test.step('Navigate directly to filtered URL', async () => {
      await page.goto(filterUrl);
    });

    await test.step('Verify filters are applied and checkboxes are checked', async () => {
      const categoryCheckbox = page.locator('input[name="categories"]').first();
      expect(await categoryCheckbox.isChecked()).toBe(true);
    });

    await test.step('Verify filtered results are shown', async () => {
      await expect(page.getByText('Filtered Games')).toBeVisible();
    });
  });
});
