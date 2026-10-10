import { useActionData, Form, useNavigation } from "react-router";
import { AppProvider, Page, Layout, Card, Button, Text, BlockStack } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
    const { admin } = await authenticate.admin(request);

    // 1. Fetch the Function ID dynamically from the store
    const functionsResponse = await admin.graphql(
        `#graphql
    query {
      shopifyFunctions(first: 50) {
        nodes {
          id
          title
        }
      }
    }`
    );

    const functionsJson = await functionsResponse.json();

    // Find the function we just built (named "pwyw-discount")
    const pwywFunction = functionsJson.data.shopifyFunctions.nodes.find(
        (f) => f.title === "pwyw-discount"
    );

    if (!pwywFunction) {
        return { error: [{ message: "Could not find the PWYW function. Ensure your dev server is running and synced." }] };
    }

    // 2. Create the automatic discount rule using the dynamically fetched ID
    const response = await admin.graphql(
        `#graphql
    mutation CreateAutomaticDiscount($discount: DiscountAutomaticAppInput!) {
      discountAutomaticAppCreate(automaticAppDiscount: $discount) {
        userErrors {
          field
          message
        }
      }
    }`,
        {
            variables: {
                discount: {
                    title: `PWYW Discount - ${Date.now()}`,
                    functionId: pwywFunction.id,
                    startsAt: new Date().toISOString(),
                    discountClasses: ["PRODUCT"], // Add this line
                },
            },
        }
    );

    const responseJson = await response.json();

    if (responseJson.data.discountAutomaticAppCreate.userErrors.length > 0) {
        const errors = responseJson.data.discountAutomaticAppCreate.userErrors;
        if (errors.some(e => e.message.includes("Title must be unique"))) {
             return { success: true, message: "The discount rule is already active! You are good to go." };
        }
        return { error: errors };
    }

    return { success: true, message: "Successfully activated! The discount logic is now live on your store." };
};

export default function SetupPage() {
    const actionData = useActionData();
    const nav = useNavigation();

    const isSubmitting = nav.state === "submitting";

    return (
        <AppProvider i18n={enTranslations}>
            <Page title="PWYW Setup">
                <Layout>
                    <Layout.Section>
                        <Card>
                            <BlockStack gap="400">
                                <Text as="h2" variant="headingMd">
                                    Enable Backend Logic
                                </Text>
                                <Text as="p">
                                    Activate the dynamic pricing function on your store. This only needs to be done once.
                                </Text>

                                {/* Safe form submission */}
                                <Form method="post">
                                    <Button submit variant="primary" loading={isSubmitting}>
                                        Enable Discount Rule
                                    </Button>
                                </Form>

                                {actionData?.success && (
                                    <Text as="p" tone="success">{actionData.message}</Text>
                                )}
                                {actionData?.error && (
                                    <BlockStack gap="200">
                                        <Text as="p" tone="critical">Error activating discount:</Text>
                                        {actionData.error.map((err, i) => (
                                            <Text key={i} as="p" tone="critical">- {err.message}</Text>
                                        ))}
                                    </BlockStack>
                                )}
                            </BlockStack>
                        </Card>
                    </Layout.Section>
                </Layout>
            </Page>
        </AppProvider>
    );
}