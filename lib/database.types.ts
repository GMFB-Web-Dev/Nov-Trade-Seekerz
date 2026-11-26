export type Json = string | number | boolean | null | {
    [key: string]: Json | undefined;
} | Json[];
export type Database = {
    "public": {
        Tables: {
            "admin_grants": {
                Row: {
                    "created_at": string;
                    "granted_by": string | null;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "created_at"?: string;
                    "granted_by"?: string | null;
                    "user_id": string;
                };
                Update: {
                    "created_at"?: string;
                    "granted_by"?: string | null;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "admin_grants_granted_by_fkey";
                        columns: [
                            "granted_by"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "admin_grants_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: true;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "applications": {
                Row: {
                    "created_at": string;
                    "id": string;
                    "introduction": string;
                    "project_id": string;
                    "status": Database["public"]["Enums"]["application_status"];
                    "tradesperson_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "created_at"?: string;
                    "id"?: string;
                    "introduction": string;
                    "project_id": string;
                    "status"?: Database["public"]["Enums"]["application_status"];
                    "tradesperson_id": string;
                };
                Update: {
                    "created_at"?: string;
                    "id"?: string;
                    "introduction"?: string;
                    "project_id"?: string;
                    "status"?: Database["public"]["Enums"]["application_status"];
                    "tradesperson_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "applications_project_id_fkey";
                        columns: [
                            "project_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "projects";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "applications_tradesperson_id_fkey";
                        columns: [
                            "tradesperson_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "audit_log": {
                Row: {
                    "actor_id": string | null;
                    "created_at": string;
                    "event": string;
                    "id": number;
                    "subject_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "actor_id"?: string | null;
                    "created_at"?: string;
                    "event": string;
                    "id"?: never;
                    "subject_id": string;
                };
                Update: {
                    "actor_id"?: string | null;
                    "created_at"?: string;
                    "event"?: string;
                    "id"?: never;
                    "subject_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "audit_log_actor_id_fkey";
                        columns: [
                            "actor_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "billing_orders": {
                Row: {
                    "buyer_id": string | null;
                    "created_at": string;
                    "credits": number;
                    "currency": string;
                    "id": string;
                    "interval": string;
                    "price_cents": number;
                    "product_slug": string;
                    "provider": string;
                    "provider_session": string | null;
                    "status": string;
                };
                ComputedFields: never;
                Insert: {
                    "buyer_id"?: string | null;
                    "created_at"?: string;
                    "credits": number;
                    "currency": string;
                    "id"?: string;
                    "interval": string;
                    "price_cents": number;
                    "product_slug": string;
                    "provider": string;
                    "provider_session"?: string | null;
                    "status"?: string;
                };
                Update: {
                    "buyer_id"?: string | null;
                    "created_at"?: string;
                    "credits"?: number;
                    "currency"?: string;
                    "id"?: string;
                    "interval"?: string;
                    "price_cents"?: number;
                    "product_slug"?: string;
                    "provider"?: string;
                    "provider_session"?: string | null;
                    "status"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "billing_orders_buyer_id_fkey";
                        columns: [
                            "buyer_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "billing_orders_product_slug_fkey";
                        columns: [
                            "product_slug"
                        ];
                        isOneToOne: false;
                        referencedRelation: "billing_products";
                        referencedColumns: [
                            "slug"
                        ];
                    }
                ];
            };
            "billing_payments": {
                Row: {
                    "amount_cents": number;
                    "created_at": string;
                    "dispute_open": boolean;
                    "order_id": string;
                    "provider_ref": string;
                    "reversed_cents": number;
                };
                ComputedFields: never;
                Insert: {
                    "amount_cents": number;
                    "created_at"?: string;
                    "dispute_open"?: boolean;
                    "order_id": string;
                    "provider_ref": string;
                    "reversed_cents"?: number;
                };
                Update: {
                    "amount_cents"?: number;
                    "created_at"?: string;
                    "dispute_open"?: boolean;
                    "order_id"?: string;
                    "provider_ref"?: string;
                    "reversed_cents"?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: "billing_payments_order_id_fkey";
                        columns: [
                            "order_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "billing_orders";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "billing_products": {
                Row: {
                    "active": boolean;
                    "credits": number;
                    "currency": string;
                    "interval": string;
                    "name": string;
                    "price_cents": number;
                    "slug": string;
                };
                ComputedFields: never;
                Insert: {
                    "active"?: boolean;
                    "credits": number;
                    "currency"?: string;
                    "interval": string;
                    "name": string;
                    "price_cents": number;
                    "slug": string;
                };
                Update: {
                    "active"?: boolean;
                    "credits"?: number;
                    "currency"?: string;
                    "interval"?: string;
                    "name"?: string;
                    "price_cents"?: number;
                    "slug"?: string;
                };
                Relationships: [
                ];
            };
            "categories": {
                Row: {
                    "active": boolean;
                    "name": string;
                    "slug": string;
                    "sort_order": number;
                };
                ComputedFields: never;
                Insert: {
                    "active"?: boolean;
                    "name": string;
                    "slug": string;
                    "sort_order"?: number;
                };
                Update: {
                    "active"?: boolean;
                    "name"?: string;
                    "slug"?: string;
                    "sort_order"?: number;
                };
                Relationships: [
                ];
            };
            "email_outbox": {
                Row: {
                    "attempts": number;
                    "created_at": string;
                    "id": string;
                    "last_error": string | null;
                    "next_attempt_at": string;
                    "notification_id": string;
                    "recipient_id": string;
                    "sent_at": string | null;
                };
                ComputedFields: never;
                Insert: {
                    "attempts"?: number;
                    "created_at"?: string;
                    "id"?: string;
                    "last_error"?: string | null;
                    "next_attempt_at"?: string;
                    "notification_id": string;
                    "recipient_id": string;
                    "sent_at"?: string | null;
                };
                Update: {
                    "attempts"?: number;
                    "created_at"?: string;
                    "id"?: string;
                    "last_error"?: string | null;
                    "next_attempt_at"?: string;
                    "notification_id"?: string;
                    "recipient_id"?: string;
                    "sent_at"?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "email_outbox_notification_id_fkey";
                        columns: [
                            "notification_id"
                        ];
                        isOneToOne: true;
                        referencedRelation: "notifications";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "email_outbox_recipient_id_fkey";
                        columns: [
                            "recipient_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "feedback": {
                Row: {
                    "created_at": string;
                    "email": string;
                    "id": string;
                    "message": string;
                    "name": string;
                };
                ComputedFields: never;
                Insert: {
                    "created_at"?: string;
                    "email": string;
                    "id"?: string;
                    "message": string;
                    "name": string;
                };
                Update: {
                    "created_at"?: string;
                    "email"?: string;
                    "id"?: string;
                    "message"?: string;
                    "name"?: string;
                };
                Relationships: [
                ];
            };
            "messages": {
                Row: {
                    "application_id": string;
                    "body": string;
                    "created_at": string;
                    "id": string;
                    "read_at": string | null;
                    "recipient_id": string | null;
                    "sender_id": string | null;
                };
                ComputedFields: never;
                Insert: {
                    "application_id": string;
                    "body": string;
                    "created_at"?: string;
                    "id"?: string;
                    "read_at"?: string | null;
                    "recipient_id"?: string | null;
                    "sender_id"?: string | null;
                };
                Update: {
                    "application_id"?: string;
                    "body"?: string;
                    "created_at"?: string;
                    "id"?: string;
                    "read_at"?: string | null;
                    "recipient_id"?: string | null;
                    "sender_id"?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "messages_application_id_fkey";
                        columns: [
                            "application_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "applications";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "messages_recipient_id_fkey";
                        columns: [
                            "recipient_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "messages_sender_id_fkey";
                        columns: [
                            "sender_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "notifications": {
                Row: {
                    "created_at": string;
                    "id": string;
                    "project_id": string;
                    "read_at": string | null;
                    "subject": string;
                    "user_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "created_at"?: string;
                    "id"?: string;
                    "project_id": string;
                    "read_at"?: string | null;
                    "subject": string;
                    "user_id": string;
                };
                Update: {
                    "created_at"?: string;
                    "id"?: string;
                    "project_id"?: string;
                    "read_at"?: string | null;
                    "subject"?: string;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "notifications_project_id_fkey";
                        columns: [
                            "project_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "projects";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "notifications_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "profile_trade_categories": {
                Row: {
                    "category_slug": string;
                    "profile_id": string;
                };
                ComputedFields: never;
                Insert: {
                    "category_slug": string;
                    "profile_id": string;
                };
                Update: {
                    "category_slug"?: string;
                    "profile_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "profile_trade_categories_category_slug_fkey";
                        columns: [
                            "category_slug"
                        ];
                        isOneToOne: false;
                        referencedRelation: "categories";
                        referencedColumns: [
                            "slug"
                        ];
                    },
                    {
                        foreignKeyName: "profile_trade_categories_profile_id_fkey";
                        columns: [
                            "profile_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "profiles": {
                Row: {
                    "bio": string;
                    "business_name": string;
                    "category_slug": string | null;
                    "created_at": string;
                    "display_name": string;
                    "id": string;
                    "onboarded_at": string | null;
                    "postcode": string;
                    "role": Database["public"]["Enums"]["account_kind"] | null;
                    "status": Database["public"]["Enums"]["account_status"];
                };
                ComputedFields: never;
                Insert: {
                    "bio"?: string;
                    "business_name"?: string;
                    "category_slug"?: string | null;
                    "created_at"?: string;
                    "display_name"?: string;
                    "id": string;
                    "onboarded_at"?: string | null;
                    "postcode"?: string;
                    "role"?: Database["public"]["Enums"]["account_kind"] | null;
                    "status"?: Database["public"]["Enums"]["account_status"];
                };
                Update: {
                    "bio"?: string;
                    "business_name"?: string;
                    "category_slug"?: string | null;
                    "created_at"?: string;
                    "display_name"?: string;
                    "id"?: string;
                    "onboarded_at"?: string | null;
                    "postcode"?: string;
                    "role"?: Database["public"]["Enums"]["account_kind"] | null;
                    "status"?: Database["public"]["Enums"]["account_status"];
                };
                Relationships: [
                    {
                        foreignKeyName: "profiles_category_slug_fkey";
                        columns: [
                            "category_slug"
                        ];
                        isOneToOne: false;
                        referencedRelation: "categories";
                        referencedColumns: [
                            "slug"
                        ];
                    }
                ];
            };
            "projects": {
                Row: {
                    "applicant_limit": number;
                    "awarded_to": string | null;
                    "budget_max": number;
                    "budget_min": number;
                    "category_slug": string;
                    "created_at": string;
                    "description": string;
                    "homeowner_id": string;
                    "id": string;
                    "invited_tradesperson_id": string | null;
                    "photo_path": string | null;
                    "postcode": string;
                    "status": Database["public"]["Enums"]["project_status"];
                    "suburb": string;
                    "title": string;
                };
                ComputedFields: never;
                Insert: {
                    "applicant_limit"?: number;
                    "awarded_to"?: string | null;
                    "budget_max": number;
                    "budget_min": number;
                    "category_slug": string;
                    "created_at"?: string;
                    "description": string;
                    "homeowner_id": string;
                    "id"?: string;
                    "invited_tradesperson_id"?: string | null;
                    "photo_path"?: string | null;
                    "postcode": string;
                    "status"?: Database["public"]["Enums"]["project_status"];
                    "suburb": string;
                    "title": string;
                };
                Update: {
                    "applicant_limit"?: number;
                    "awarded_to"?: string | null;
                    "budget_max"?: number;
                    "budget_min"?: number;
                    "category_slug"?: string;
                    "created_at"?: string;
                    "description"?: string;
                    "homeowner_id"?: string;
                    "id"?: string;
                    "invited_tradesperson_id"?: string | null;
                    "photo_path"?: string | null;
                    "postcode"?: string;
                    "status"?: Database["public"]["Enums"]["project_status"];
                    "suburb"?: string;
                    "title"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "projects_awarded_to_fkey";
                        columns: [
                            "awarded_to"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "projects_category_slug_fkey";
                        columns: [
                            "category_slug"
                        ];
                        isOneToOne: false;
                        referencedRelation: "categories";
                        referencedColumns: [
                            "slug"
                        ];
                    },
                    {
                        foreignKeyName: "projects_homeowner_id_fkey";
                        columns: [
                            "homeowner_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "projects_invited_tradesperson_id_fkey";
                        columns: [
                            "invited_tradesperson_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "quotes": {
                Row: {
                    "amount_cents": number;
                    "application_id": string;
                    "description": string;
                    "updated_at": string;
                };
                ComputedFields: never;
                Insert: {
                    "amount_cents": number;
                    "application_id": string;
                    "description": string;
                    "updated_at"?: string;
                };
                Update: {
                    "amount_cents"?: number;
                    "application_id"?: string;
                    "description"?: string;
                    "updated_at"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "quotes_application_id_fkey";
                        columns: [
                            "application_id"
                        ];
                        isOneToOne: true;
                        referencedRelation: "applications";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "reports": {
                Row: {
                    "created_at": string;
                    "handled_by": string | null;
                    "id": string;
                    "project_id": string | null;
                    "reason": string;
                    "reporter_id": string | null;
                    "resolution": string | null;
                    "resolved_at": string | null;
                    "status": string;
                    "subject_id": string;
                    "subject_kind": string;
                };
                ComputedFields: never;
                Insert: {
                    "created_at"?: string;
                    "handled_by"?: string | null;
                    "id"?: string;
                    "project_id"?: string | null;
                    "reason": string;
                    "reporter_id"?: string | null;
                    "resolution"?: string | null;
                    "resolved_at"?: string | null;
                    "status"?: string;
                    "subject_id": string;
                    "subject_kind": string;
                };
                Update: {
                    "created_at"?: string;
                    "handled_by"?: string | null;
                    "id"?: string;
                    "project_id"?: string | null;
                    "reason"?: string;
                    "reporter_id"?: string | null;
                    "resolution"?: string | null;
                    "resolved_at"?: string | null;
                    "status"?: string;
                    "subject_id"?: string;
                    "subject_kind"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "reports_handled_by_fkey";
                        columns: [
                            "handled_by"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "reports_project_id_fkey";
                        columns: [
                            "project_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "projects";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "reports_reporter_id_fkey";
                        columns: [
                            "reporter_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "reviews": {
                Row: {
                    "body": string;
                    "created_at": string;
                    "homeowner_id": string | null;
                    "id": string;
                    "project_id": string | null;
                    "rating": number;
                    "tradesperson_id": string;
                    "visible": boolean;
                };
                ComputedFields: never;
                Insert: {
                    "body": string;
                    "created_at"?: string;
                    "homeowner_id"?: string | null;
                    "id"?: string;
                    "project_id"?: string | null;
                    "rating": number;
                    "tradesperson_id": string;
                    "visible"?: boolean;
                };
                Update: {
                    "body"?: string;
                    "created_at"?: string;
                    "homeowner_id"?: string | null;
                    "id"?: string;
                    "project_id"?: string | null;
                    "rating"?: number;
                    "tradesperson_id"?: string;
                    "visible"?: boolean;
                };
                Relationships: [
                    {
                        foreignKeyName: "reviews_homeowner_id_fkey";
                        columns: [
                            "homeowner_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "reviews_project_id_fkey";
                        columns: [
                            "project_id"
                        ];
                        isOneToOne: true;
                        referencedRelation: "projects";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "reviews_tradesperson_id_fkey";
                        columns: [
                            "tradesperson_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "stripe_webhook_events": {
                Row: {
                    "id": string;
                    "kind": string;
                    "processed_at": string;
                };
                ComputedFields: never;
                Insert: {
                    "id": string;
                    "kind": string;
                    "processed_at"?: string;
                };
                Update: {
                    "id"?: string;
                    "kind"?: string;
                    "processed_at"?: string;
                };
                Relationships: [
                ];
            };
            "subscriptions": {
                Row: {
                    "buyer_id": string | null;
                    "created_at": string;
                    "id": string;
                    "order_id": string;
                    "product_slug": string;
                    "provider_ref": string;
                    "renews_at": string | null;
                    "status": string;
                };
                ComputedFields: never;
                Insert: {
                    "buyer_id"?: string | null;
                    "created_at"?: string;
                    "id"?: string;
                    "order_id": string;
                    "product_slug": string;
                    "provider_ref": string;
                    "renews_at"?: string | null;
                    "status": string;
                };
                Update: {
                    "buyer_id"?: string | null;
                    "created_at"?: string;
                    "id"?: string;
                    "order_id"?: string;
                    "product_slug"?: string;
                    "provider_ref"?: string;
                    "renews_at"?: string | null;
                    "status"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "subscriptions_buyer_id_fkey";
                        columns: [
                            "buyer_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "subscriptions_order_id_fkey";
                        columns: [
                            "order_id"
                        ];
                        isOneToOne: true;
                        referencedRelation: "billing_orders";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "subscriptions_product_slug_fkey";
                        columns: [
                            "product_slug"
                        ];
                        isOneToOne: false;
                        referencedRelation: "billing_products";
                        referencedColumns: [
                            "slug"
                        ];
                    }
                ];
            };
            "system_errors": {
                Row: {
                    "code": string;
                    "created_at": string;
                    "id": number;
                    "scope": string;
                };
                ComputedFields: never;
                Insert: {
                    "code": string;
                    "created_at"?: string;
                    "id"?: never;
                    "scope": string;
                };
                Update: {
                    "code"?: string;
                    "created_at"?: string;
                    "id"?: never;
                    "scope"?: string;
                };
                Relationships: [
                ];
            };
            "token_ledger": {
                Row: {
                    "created_at": string;
                    "delta": number;
                    "id": string;
                    "reason": string;
                    "reference": string;
                    "user_id": string | null;
                };
                ComputedFields: never;
                Insert: {
                    "created_at"?: string;
                    "delta": number;
                    "id"?: string;
                    "reason": string;
                    "reference": string;
                    "user_id"?: string | null;
                };
                Update: {
                    "created_at"?: string;
                    "delta"?: number;
                    "id"?: string;
                    "reason"?: string;
                    "reference"?: string;
                    "user_id"?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "token_ledger_user_id_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "trade_documents": {
                Row: {
                    "created_at": string;
                    "id": string;
                    "object_path": string;
                    "owner_id": string;
                    "reviewed_at": string | null;
                    "reviewed_by": string | null;
                    "staff_note": string | null;
                    "status": string;
                    "title": string;
                };
                ComputedFields: never;
                Insert: {
                    "created_at"?: string;
                    "id"?: string;
                    "object_path": string;
                    "owner_id"?: string;
                    "reviewed_at"?: string | null;
                    "reviewed_by"?: string | null;
                    "staff_note"?: string | null;
                    "status"?: string;
                    "title": string;
                };
                Update: {
                    "created_at"?: string;
                    "id"?: string;
                    "object_path"?: string;
                    "owner_id"?: string;
                    "reviewed_at"?: string | null;
                    "reviewed_by"?: string | null;
                    "staff_note"?: string | null;
                    "status"?: string;
                    "title"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "trade_documents_owner_id_fkey";
                        columns: [
                            "owner_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "trade_documents_reviewed_by_fkey";
                        columns: [
                            "reviewed_by"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            "list_accounts": {
                Args: {
                    "account_filter": string;
                    "first_row": number;
                    "row_limit": number;
                    "search_term": string;
                };
                Returns: {
                    "business_name": string;
                    "created_at": string;
                    "display_name": string;
                    "email": string;
                    "id": string;
                    "is_staff": boolean;
                    "role": Database["public"]["Enums"]["account_kind"];
                    "status": Database["public"]["Enums"]["account_status"];
                    "total": number;
                }[];
            };
            "mark_message_thread_read": {
                Args: {
                    "last_message_id": string;
                };
                Returns: number;
            };
            "market_action": {
                Args: {
                    "args"?: Json;
                    "command": string;
                };
                Returns: string;
            };
            "record_billing_event": {
                Args: {
                    "billing_provider": string;
                    "currency_code"?: string;
                    "event_key": string;
                    "event_kind": string;
                    "membership_ref"?: string;
                    "membership_state"?: string;
                    "next_renewal"?: string;
                    "order_key"?: string;
                    "payment_ref"?: string;
                    "total_cents"?: number;
                };
                Returns: boolean;
            };
            "review_trade_document": {
                Args: {
                    "decision": string;
                    "document_key": string;
                    "reason": string;
                };
                Returns: undefined;
            };
            "submit_contact": {
                Args: {
                    "body": string;
                    "sender_email": string;
                    "sender_name": string;
                };
                Returns: undefined;
            };
            "token_balance": {
                Args: Record<PropertyKey, never>;
                Returns: number;
            };
        };
        Enums: {
            "account_kind": "homeowner" | "tradesperson";
            "account_status": "active" | "banned" | "deactivated";
            "application_status": "pending" | "awarded" | "declined" | "withdrawn" | "completed";
            "project_status": "open" | "awarded" | "completed" | "cancelled";
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};
type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];
export type Tables<DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | {
    schema: keyof DatabaseWithoutInternals;
}, TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"]) : never = never> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
    Row: infer R;
} ? R : never : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
    Row: infer R;
} ? R : never : never;
export type TablesInsert<DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | {
    schema: keyof DatabaseWithoutInternals;
}, TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] : never = never> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I;
} ? I : never : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I;
} ? I : never : never;
export type TablesUpdate<DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | {
    schema: keyof DatabaseWithoutInternals;
}, TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] : never = never> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U;
} ? U : never : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U;
} ? U : never : never;
export type Enums<DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | {
    schema: keyof DatabaseWithoutInternals;
}, EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"] : never = never> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName] : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions] : never;
export type CompositeTypes<PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] | {
    schema: keyof DatabaseWithoutInternals;
}, CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"] : never = never> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName] : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions] : never;
export const Constants = {
    "public": {
        Enums: {
            "account_kind": ["homeowner", "tradesperson"],
            "account_status": ["active", "banned", "deactivated"],
            "application_status": ["pending", "awarded", "declined", "withdrawn", "completed"],
            "project_status": ["open", "awarded", "completed", "cancelled"]
        }
    }
} as const;
